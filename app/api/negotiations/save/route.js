import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export async function POST(request) {
  const client = await pool.connect();
  
  try {
    const token = request.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyJWT(token);
    if (!payload || payload.role !== 'CC') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { categoryId, negotiation, demands, newDemands } = body;

    if (!categoryId) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    await client.query('BEGIN');

    // 1. Upsert Negotiation Record
    // Check if exists
    const checkNeg = await client.query('SELECT id FROM negotiations WHERE id = $1', [categoryId]);
    
    if (checkNeg.rows.length > 0) {
      await client.query(
        `UPDATE negotiations 
         SET status = $1, 
             cc_present = $2, 
             category_representatives = $3,
             updated_at = NOW()
         WHERE id = $4`,
        [
          negotiation.status, 
          negotiation.cc_present || [], 
          negotiation.category_representatives || [], 
          categoryId
        ]
      );
    } else {
      await client.query(
        `INSERT INTO negotiations (id, status, cc_present, category_representatives)
         VALUES ($1, $2, $3, $4)`,
        [
          categoryId, 
          negotiation.status, 
          negotiation.cc_present || [], 
          negotiation.category_representatives || []
        ]
      );
    }

    // 2. Insert New Demands
    if (newDemands && newDemands.length > 0) {
      for (const demand of newDemands) {
         // Basic validation
         if (!demand.item_name || !demand.quantity || !demand.unit) {
             throw new Error("New demands must have name, quantity and unit");
         }
         
         // Check logic for default negotiated value
         let negotiated = demand.negotiated;
         if (negotiated === undefined || negotiated === '' || negotiated === null) {
            const status = demand.status || 'under review';
            if (status === 'approved') {
               negotiated = demand.quantity;
            } else if (status === 'rejected') {
               negotiated = 0;
            } else {
               negotiated = null; // for under review
            }
         }

         await client.query(
           `INSERT INTO demands (user_id, item_name, quantity, unit, reason, status, negotiated, remarks, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
            [
              categoryId, 
              demand.item_name, 
              demand.quantity, 
              demand.unit, 
              demand.reason || '',
              demand.status || 'pending',
              negotiated,
              demand.remarks || ''
            ]
         );
      }
    }

    // 3. Update Existing Demands
    if (demands && demands.length > 0) {
      for (const demand of demands) {
        // Only update if fields are present
        const fields = [];
        const values = [];
        let idx = 1;

        if (demand.negotiated !== undefined && demand.negotiated !== '' && demand.negotiated !== null) {
            fields.push(`negotiated = $${idx++}`);
            values.push(demand.negotiated);
        } else if (demand.status !== undefined) {
             // Status changed, apply defaults for 'negotiated'
             if (demand.status === 'approved') fields.push(`negotiated = quantity`);
             else if (demand.status === 'rejected') fields.push(`negotiated = 0`);
             else fields.push(`negotiated = NULL`);
        } else if (demand.negotiated !== undefined) {
             // Negotiated explicitly cleared, status unchanged
             fields.push(`negotiated = CASE 
                  WHEN status = 'approved' THEN quantity 
                  WHEN status = 'rejected' THEN 0 
                  ELSE NULL 
             END`);
        }
        if (demand.remarks !== undefined) {
          fields.push(`remarks = $${idx++}`);
          values.push(demand.remarks);
        }
        if (demand.status !== undefined) {
          fields.push(`status = $${idx++}`);
          values.push(demand.status);
        }

        if (fields.length > 0) {
          values.push(demand.id);
          await client.query(
            `UPDATE demands SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
            values
          );
        }
      }
    }

    // 4. Apply Default Negotiation Rules for Category
    // Ensure all items follow rules: Approved->Quantity, Rejected->0, if negotiated is null
    await client.query(`
       UPDATE demands 
       SET negotiated = CASE
           WHEN status = 'approved' THEN quantity
           WHEN status = 'rejected' THEN 0
           ELSE NULL
       END
       WHERE user_id = $1 
       AND negotiated IS NULL 
       AND status IN ('approved', 'rejected')
    `, [categoryId]);

    await client.query('COMMIT');
    return NextResponse.json({ success: true });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Save negotiation error:', error);
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
