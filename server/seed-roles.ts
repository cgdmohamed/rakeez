import { db } from './db';
import { roles } from '../shared/schema';
import { VALID_PERMISSIONS } from '../shared/permissions';
import { eq } from 'drizzle-orm';

async function seedDefaultRoles() {
  console.log('Seeding default system roles...');
  
  const systemRoles = [
    {
      name: 'Admin',
      description: 'Full system administrator with all permissions',
      permissions: VALID_PERMISSIONS,
      isActive: true,
      isSystemRole: true,
    },
    {
      name: 'Finance',
      description: 'Financial operations and reporting',
      permissions: [
        'payments.view', 'payments.process', 'payments.refund',
        'financial.viewAll', 'financial.reports',
        'bookings.view',
        'customers.view',
        'analytics.view', 'analytics.export',
      ],
      isActive: true,
      isSystemRole: true,
    },
    {
      name: 'Support',
      description: 'Customer support operations',
      permissions: [
        'customers.view', 'customers.edit',
        'bookings.view', 'bookings.edit',
        'support.view', 'support.respond', 'support.close',
        'services.view',
      ],
      isActive: true,
      isSystemRole: true,
    },
    {
      name: 'Technician Manager',
      description: 'Manage technicians and job assignments',
      permissions: [
        'technicians.view', 'technicians.create', 'technicians.edit',
        'bookings.view', 'bookings.assign',
        'customers.view',
        'services.view',
      ],
      isActive: true,
      isSystemRole: true,
    },
  ];
  
  try {
    for (const role of systemRoles) {
      // Check if role already exists
      const [existing] = await db.select().from(roles).where(eq(roles.name, role.name));
      
      if (existing) {
        console.log(`✓ Role "${role.name}" already exists, skipping...`);
      } else {
        await db.insert(roles).values(role);
        console.log(`✓ Created role: ${role.name}`);
      }
    }
    
    console.log('\n✅ Default roles seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding roles:', error);
    process.exit(1);
  }
}

seedDefaultRoles();
