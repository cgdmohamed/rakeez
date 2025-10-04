export type UserRole = 'customer' | 'technician' | 'admin' | 'support' | 'finance';

export type Permission =
  // User Management
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.delete'
  
  // Customer Management
  | 'customers.view'
  | 'customers.edit'
  | 'customers.delete'
  
  // Bookings/Orders
  | 'bookings.view'
  | 'bookings.create'
  | 'bookings.edit'
  | 'bookings.delete'
  | 'bookings.assign'
  
  // Financial
  | 'payments.view'
  | 'payments.process'
  | 'payments.refund'
  | 'financial.viewAll'
  | 'financial.reports'
  
  // Support
  | 'support.view'
  | 'support.respond'
  | 'support.close'
  
  // Services
  | 'services.view'
  | 'services.create'
  | 'services.edit'
  | 'services.delete'
  
  // Analytics
  | 'analytics.view'
  | 'analytics.export'
  
  // Technicians
  | 'technicians.view'
  | 'technicians.create'
  | 'technicians.edit'
  | 'technicians.delete';

// Canonical list of all valid permissions
export const VALID_PERMISSIONS: Permission[] = [
  'users.view', 'users.create', 'users.edit', 'users.delete',
  'customers.view', 'customers.edit', 'customers.delete',
  'bookings.view', 'bookings.create', 'bookings.edit', 'bookings.delete', 'bookings.assign',
  'payments.view', 'payments.process', 'payments.refund',
  'financial.viewAll', 'financial.reports',
  'support.view', 'support.respond', 'support.close',
  'services.view', 'services.create', 'services.edit', 'services.delete',
  'analytics.view', 'analytics.export',
  'technicians.view', 'technicians.create', 'technicians.edit', 'technicians.delete',
];

// Structured permissions for UI display
export interface PermissionInfo {
  id: Permission;
  label: string;
  category: string;
}

export const PERMISSIONS_CATALOG: PermissionInfo[] = [
  { id: 'users.view', label: 'View Users', category: 'Users' },
  { id: 'users.create', label: 'Create Users', category: 'Users' },
  { id: 'users.edit', label: 'Edit Users', category: 'Users' },
  { id: 'users.delete', label: 'Delete Users', category: 'Users' },
  
  { id: 'customers.view', label: 'View Customers', category: 'Customers' },
  { id: 'customers.edit', label: 'Edit Customers', category: 'Customers' },
  { id: 'customers.delete', label: 'Delete Customers', category: 'Customers' },
  
  { id: 'bookings.view', label: 'View Bookings', category: 'Bookings' },
  { id: 'bookings.create', label: 'Create Bookings', category: 'Bookings' },
  { id: 'bookings.edit', label: 'Edit Bookings', category: 'Bookings' },
  { id: 'bookings.delete', label: 'Delete Bookings', category: 'Bookings' },
  { id: 'bookings.assign', label: 'Assign Bookings', category: 'Bookings' },
  
  { id: 'payments.view', label: 'View Payments', category: 'Finance' },
  { id: 'payments.process', label: 'Process Payments', category: 'Finance' },
  { id: 'payments.refund', label: 'Refund Payments', category: 'Finance' },
  { id: 'financial.viewAll', label: 'View All Financial Data', category: 'Finance' },
  { id: 'financial.reports', label: 'Financial Reports', category: 'Finance' },
  
  { id: 'support.view', label: 'View Support Tickets', category: 'Support' },
  { id: 'support.respond', label: 'Respond to Tickets', category: 'Support' },
  { id: 'support.close', label: 'Close Tickets', category: 'Support' },
  
  { id: 'services.view', label: 'View Services', category: 'Services' },
  { id: 'services.create', label: 'Create Services', category: 'Services' },
  { id: 'services.edit', label: 'Edit Services', category: 'Services' },
  { id: 'services.delete', label: 'Delete Services', category: 'Services' },
  
  { id: 'analytics.view', label: 'View Analytics', category: 'Analytics' },
  { id: 'analytics.export', label: 'Export Analytics', category: 'Analytics' },
  
  { id: 'technicians.view', label: 'View Technicians', category: 'Technicians' },
  { id: 'technicians.create', label: 'Create Technicians', category: 'Technicians' },
  { id: 'technicians.edit', label: 'Edit Technicians', category: 'Technicians' },
  { id: 'technicians.delete', label: 'Delete Technicians', category: 'Technicians' },
];

export const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    // Full access to everything
    'users.view', 'users.create', 'users.edit', 'users.delete',
    'customers.view', 'customers.edit', 'customers.delete',
    'bookings.view', 'bookings.create', 'bookings.edit', 'bookings.delete', 'bookings.assign',
    'payments.view', 'payments.process', 'payments.refund',
    'financial.viewAll', 'financial.reports',
    'support.view', 'support.respond', 'support.close',
    'services.view', 'services.create', 'services.edit', 'services.delete',
    'analytics.view', 'analytics.export',
    'technicians.view', 'technicians.create', 'technicians.edit', 'technicians.delete',
  ],
  
  finance: [
    // Financial operations
    'payments.view', 'payments.process', 'payments.refund',
    'financial.viewAll', 'financial.reports',
    'bookings.view',
    'customers.view',
    'analytics.view', 'analytics.export',
  ],
  
  support: [
    // Customer support operations
    'customers.view', 'customers.edit',
    'bookings.view', 'bookings.edit',
    'support.view', 'support.respond', 'support.close',
    'services.view',
  ],
  
  technician: [
    // Technician-specific operations
    'bookings.view',
    'customers.view',
  ],
  
  customer: [
    // Customer-specific operations (minimal)
    'bookings.view',
    'support.view',
  ],
};

export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  return rolePermissions[userRole]?.includes(permission) || false;
}

export function hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(userRole, permission));
}

export function hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(userRole, permission));
}

export const roleLabels: Record<UserRole, { en: string; ar: string }> = {
  admin: { en: 'Admin', ar: 'مسؤول' },
  finance: { en: 'Finance', ar: 'محاسب' },
  support: { en: 'Support', ar: 'دعم فني' },
  technician: { en: 'Technician', ar: 'فني' },
  customer: { en: 'Customer', ar: 'عميل' },
};
