import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const token = request.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyJWT(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { role } = payload;
    if (!['CC', 'OC'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const client = await pool.connect();
    try {
      // Fetch invoice with details and related deliveries
      const invoiceRes = await client.query(`
        SELECT i.*, u.name as category_name
        FROM invoices i
        JOIN users u ON i.category_id = u.id
        WHERE i.id = $1
      `, [id]);
      
      if (invoiceRes.rowCount === 0) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }

      const invoice = invoiceRes.rows[0];

      // Fetch related deliveries with details
      const deliveriesQuery = `
        SELECT 
            d.*,
            m.quantity as mapped_total,
            inv.item_name as inventory_name,
            inv.unit,
            dem.item_name as demand_name,
            dem.id as demand_id,
            m.inventory_id
        FROM deliveries d
        JOIN mappings m ON d.mapping_id = m.id
        JOIN inventory inv ON m.inventory_id = inv.id
        JOIN demands dem ON m.demand_id = dem.id
        WHERE d.invoice_id = $1
      `;
      const deliveriesRes = await client.query(deliveriesQuery, [id]);

      return NextResponse.json({
        ...invoice,
        deliveries: deliveriesRes.rows
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
    try {
        const token = request.cookies.get('session_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        
        const payload = await verifyJWT(token);
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
        const { role } = payload;
        if (!['CC', 'OC'].includes(role)) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
    
        const { id } = await params;
        const body = await request.json();
        const { category_id, created_at, deliveries } = body;

        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          // 1. Update Invoice Details (Category / Date)
          if (category_id || created_at) {
             const updates = [];
             const values = [];
             let idx = 1;

             if (category_id) {
                 updates.push(`category_id = $${idx++}`);
                 values.push(category_id);
             }
             if (created_at) {
                 updates.push(`created_at = $${idx++}`);
                 values.push(created_at);
             }
             values.push(id); 

             if (updates.length > 0) {
                const query = `UPDATE invoices SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
                const res = await client.query(query, values);
                if (res.rowCount === 0) {
                    throw new Error("Invoice not found");
                }
             }
          }

          // 2. Update Deliveries
          if (deliveries && Array.isArray(deliveries)) {
             // Get existing deliveries
             const existingRes = await client.query('SELECT * FROM deliveries WHERE invoice_id = $1', [id]);
             const existingMap = new Map();
             existingRes.rows.forEach(d => existingMap.set(d.id, d));
             
             for (const item of deliveries) {
                 const { id: deliveryId, quantity: newQty, returnable, inventory_id } = item;
                 
                 if (deliveryId) {
                     const oldRecord = existingMap.get(deliveryId);
                     // Update existing delivery
                     if (oldRecord) {
                        const oldQty = oldRecord.quantity;
                        const diff = Number(newQty) - oldQty;
                        
                        if (diff !== 0) {
                            // Need inventory_id to update stock
                            const mapRes = await client.query('SELECT inventory_id, item_name FROM mappings m JOIN inventory i ON m.inventory_id = i.id WHERE m.id = $1', [oldRecord.mapping_id]);
                            if (mapRes.rowCount === 0) throw new Error(`Mapping not found for delivery ${deliveryId}`);
                            const { inventory_id, item_name } = mapRes.rows[0];
                            
                            if (diff > 0) {
                                // increased quantity -> decrease stock
                                const invCheck = await client.query('SELECT quantity FROM inventory WHERE id = $1 FOR UPDATE', [inventory_id]);
                                if (invCheck.rowCount === 0) throw new Error("Inventory not found");
                                if (invCheck.rows[0].quantity < diff) {
                                    throw new Error(`Insufficient stock for ${item_name}. Needed ${diff}, available ${invCheck.rows[0].quantity}`);
                                }
                            }
                            // Update inventory (works for both increase and decrease)
                            await client.query('UPDATE inventory SET quantity = quantity - $1 WHERE id = $2', [diff, inventory_id]);
                        }
                        
                        // Update delivery record
                        if (Number(newQty) === 0) {
                            await client.query('DELETE FROM deliveries WHERE id = $1', [deliveryId]);
                        } else {
                            await client.query(
                                'UPDATE deliveries SET quantity = $1, returnable = $2 WHERE id = $3',
                                [newQty, returnable ?? oldRecord.returnable, deliveryId]
                            );
                        }
                     }
                 } else if (inventory_id && newQty > 0) {
                     // Add NEW Delivery
                     // Logic adapted from POST /api/invoices
                     
                     // Get current category_id (might be updated in this transaction but use what we have)
                     // If we are updating category, strict correctness is hard, but let's assume we use the invoice's category.
                     let catId = category_id;
                     if(!catId) {
                         const invRes = await client.query('SELECT category_id FROM invoices WHERE id = $1', [id]);
                         catId = invRes.rows[0].category_id;
                     }

                     // 0. Pre-check Mappings
                     const existingMappings = await client.query(
                        `SELECT m.id, d.item_name as demand_name
                         FROM mappings m 
                         JOIN demands d ON m.demand_id = d.id 
                         WHERE m.inventory_id = $1 
                         AND d.user_id = $2
                         AND lower(d.item_name) != 'additional'`,
                         [inventory_id, catId]
                      );
           
                      // If mapped, we MUST use that mapping_id.
                      // If the user added this item as "New Item", they might not know the mapping.
                      // We should auto-resolve it to the existing mapping if present.
                      let finalMappingId;
                      
                      if (existingMappings.rowCount > 0) {
                          finalMappingId = existingMappings.rows[0].id;
                      } else {
                          // 1. Handle Additional
                          let demandRes = await client.query(
                              "SELECT id FROM demands WHERE user_id = $1 AND lower(item_name) = 'additional'", 
                              [catId]
                          );
                          
                          let demandId;
                          if (demandRes.rowCount > 0) {
                              demandId = demandRes.rows[0].id;
                          } else {
                              const newDemand = await client.query(
                                  "INSERT INTO demands (user_id, item_name, quantity, unit, status, reason) VALUES ($1, 'Additional', 0, 'General', 'approved', 'Auto-generated for edited invoice') RETURNING id",
                                  [catId]
                              );
                              demandId = newDemand.rows[0].id;
                          }
               
                          // 2. Check/Create Mapping
                          let mapRes = await client.query(
                              "SELECT id, quantity FROM mappings WHERE demand_id = $1 AND inventory_id = $2",
                              [demandId, inventory_id]
                          );
               
                          if (mapRes.rowCount > 0) {
                              finalMappingId = mapRes.rows[0].id;
                              await client.query('UPDATE mappings SET quantity = quantity + $1 WHERE id = $2', [newQty, finalMappingId]);
                          } else {
                              const newMap = await client.query(
                                  "INSERT INTO mappings (demand_id, inventory_id, quantity) VALUES ($1, $2, $3) RETURNING id",
                                  [demandId, inventory_id, newQty]
                              );
                              finalMappingId = newMap.rows[0].id;
                          }
                      }

                      // Check Stock
                      const invRes = await client.query('SELECT quantity, item_name FROM inventory WHERE id = $1 FOR UPDATE', [inventory_id]);
                      if (invRes.rowCount === 0) throw new Error("Inventory not found");
                      if (invRes.rows[0].quantity < newQty) {
                          throw new Error(`Insufficient stock for ${invRes.rows[0].item_name}. Needed ${newQty}, available ${invRes.rows[0].quantity}`);
                      }

                      // Deduct
                      await client.query('UPDATE inventory SET quantity = quantity - $1 WHERE id = $2', [newQty, inventory_id]);

                      // Insert
                      await client.query(
                          'INSERT INTO deliveries (invoice_id, mapping_id, quantity, returnable) VALUES ($1, $2, $3, $4)',
                          [id, finalMappingId, newQty, returnable || false]
                      );
                 }
             }
          }
          
          await client.query('COMMIT');
          return NextResponse.json({ success: true });
        } catch (error) {
          await client.query('ROLLBACK');
          console.error('Error updating invoice:', error);
          return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
        } finally {
          client.release();
        }
      } catch (error) {
        console.error('Error updating invoice:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
      }
}

export async function DELETE(request, { params }) {
  try {
    const token = request.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyJWT(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { role } = payload;
    // Only CC can delete
    if (role !== 'CC') {
      return NextResponse.json({ error: 'Forbidden: Only CC can delete invoices' }, { status: 403 });
    }

    const { id } = await params;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Get all deliveries for this invoice to restore inventory
      const deliveriesRes = await client.query(`
          SELECT d.quantity, m.inventory_id, i.item_name
          FROM deliveries d
          JOIN mappings m ON d.mapping_id = m.id
          JOIN inventory i ON m.inventory_id = i.id
          WHERE d.invoice_id = $1
      `, [id]);

      // 2. Restore Inventory
      for (const row of deliveriesRes.rows) {
          await client.query(
              'UPDATE inventory SET quantity = quantity + $1 WHERE id = $2',
              [row.quantity, row.inventory_id]
          );
      }

      // 3. Delete Invoice (Cascade will handle deliveries)
      const result = await client.query('DELETE FROM invoices WHERE id = $1 RETURNING id', [id]);
      
      if (result.rowCount === 0) {
        throw new Error('Invoice not found');
      }

      await client.query('COMMIT');
      return NextResponse.json({ message: 'Invoice deleted successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error deleting invoice:', error);
      return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
