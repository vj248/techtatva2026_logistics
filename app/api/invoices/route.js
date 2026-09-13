import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export async function GET(request) {
  try {
    const token = request.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyJWT(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { role } = payload;
    if (!['CC', 'OC'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT i.*, u.name as category_name
        FROM invoices i
        JOIN users u ON i.category_id = u.id
        ORDER BY i.created_at DESC
      `);
      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const token = request.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyJWT(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { role } = payload;
    if (!['CC', 'OC'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { category_id, deliveries, created_at } = body;

    if (!category_id) {
        return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    if (!deliveries || !Array.isArray(deliveries) || deliveries.length === 0) {
        return NextResponse.json({ error: 'Deliveries list is required and cannot be empty' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Create Invoice
      let invoiceRes;
      if (created_at) {
         invoiceRes = await client.query(
          'INSERT INTO invoices (category_id, created_at) VALUES ($1, $2) RETURNING *',
          [category_id, created_at]
        );
      } else {
         invoiceRes = await client.query(
          'INSERT INTO invoices (category_id) VALUES ($1) RETURNING *',
          [category_id]
        );
      }
      const invoice = invoiceRes.rows[0];

      // Create Deliveries
      for (const item of deliveries) {
        let { mapping_id, quantity, returnable, inventory_id } = item;
        
        if (!quantity || quantity <= 0) {
             throw new Error('Invalid delivery item quantity');
        }

        // Handle "Additional" items (no mapping_id provided)
        if (!mapping_id && inventory_id) {
           // 0. Pre-check: Ensure item is not already mapped to any OTHER demand for this category
           const existingMappings = await client.query(
             `SELECT m.id, d.item_name as demand_name
              FROM mappings m 
              JOIN demands d ON m.demand_id = d.id 
              WHERE m.inventory_id = $1 
              AND d.user_id = $2
              AND lower(d.item_name) != 'additional'`,
              [inventory_id, category_id]
           );

           if (existingMappings.rowCount > 0) {
              const mappedName = existingMappings.rows[0].demand_name;
              throw new Error(`Inventory item is already mapped to demand '${mappedName}'. Please deliver using the existing demand.`);
           }

           // 1. Check/Create "Additional" Demand
           let demandRes = await client.query(
               "SELECT id FROM demands WHERE user_id = $1 AND lower(item_name) = 'additional'", 
               [category_id]
           );
           
           let demandId;
           if (demandRes.rowCount > 0) {
               demandId = demandRes.rows[0].id;
           } else {
               // Create new Additional Demand
               const newDemand = await client.query(
                   "INSERT INTO demands (user_id, item_name, quantity, unit, status, reason) VALUES ($1, 'Additional', 0, 'General', 'approved', 'Auto-generated for additional deliveries') RETURNING id",
                   [category_id]
               );
               demandId = newDemand.rows[0].id;
           }

           // 2. Check/Create Mapping
           // Check if this inventory item is already mapped to the additional demand
           let mapRes = await client.query(
               "SELECT id, quantity FROM mappings WHERE demand_id = $1 AND inventory_id = $2",
               [demandId, inventory_id]
           );

           if (mapRes.rowCount > 0) {
               mapping_id = mapRes.rows[0].id;
               // Optional: Update mapping quantity to reflect more allocated? 
               // For now, we leave it as is, or maybe increase it.
               // Let's increase it to keep track that we used more.
               await client.query('UPDATE mappings SET quantity = quantity + $1 WHERE id = $2', [quantity, mapping_id]);
           } else {
               // Create new mapping
               const newMap = await client.query(
                   "INSERT INTO mappings (demand_id, inventory_id, quantity) VALUES ($1, $2, $3) RETURNING id",
                   [demandId, inventory_id, quantity] // Initialize allocation with this delivery amount
               );
               mapping_id = newMap.rows[0].id;
           }
        }

        if (!mapping_id) {
            throw new Error('Missing mapping_id or inventory_id for delivery item');
        }

        // Check Inventory Stock
        const mappingRes = await client.query('SELECT inventory_id FROM mappings WHERE id = $1', [mapping_id]);
        if (mappingRes.rowCount === 0) throw new Error(`Mapping ID ${mapping_id} not found`);
        
        const inventoryId = mappingRes.rows[0].inventory_id;
        
        const invRes = await client.query('SELECT quantity, item_name FROM inventory WHERE id = $1', [inventoryId]);
        if (invRes.rowCount === 0) throw new Error(`Inventory item for mapping ${mapping_id} not found`);
        
        const currentStock = invRes.rows[0].quantity;
        if (currentStock < quantity) {
            throw new Error(`Insufficient stock for ${invRes.rows[0].item_name}. Available: ${currentStock}, Requested: ${quantity}`);
        }

        // Deduct from Inventory
        await client.query('UPDATE inventory SET quantity = quantity - $1 WHERE id = $2', [quantity, inventoryId]);
        
        await client.query(
            'INSERT INTO deliveries (invoice_id, mapping_id, quantity, returnable) VALUES ($1, $2, $3, $4)',
            [invoice.id, mapping_id, quantity, returnable || false]
        );
      }

      await client.query('COMMIT');
      return NextResponse.json(invoice, { status: 201 });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating invoice:', error);
      return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
