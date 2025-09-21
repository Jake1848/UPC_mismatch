import { PrismaClient, Role, Plan, ConflictType, Severity, Priority, ConflictStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create demo organization
  const organization = await prisma.organization.upsert({
    where: { slug: 'acme-warehouse' },
    update: {},
    create: {
      name: 'ACME Warehouse Corp',
      slug: 'acme-warehouse',
      plan: Plan.PROFESSIONAL,
      maxUsers: 10,
      maxProducts: 1000000,
      settings: {
        notifications: {
          email: true,
          slack: false,
          teams: false
        },
        analysis: {
          autoAssignConflicts: true,
          severityThresholds: {
            low: 2,
            medium: 5,
            high: 10,
            critical: 50
          }
        }
      }
    }
  })

  console.log(`📦 Created organization: ${organization.name}`)

  // Create demo users with environment-based passwords
  // Use environment variables for passwords or generate random ones
  const adminPassword = await bcrypt.hash(
    process.env.SEED_ADMIN_PASSWORD ||
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2).toUpperCase() + '!@#',
    12
  )
  const analystPassword = await bcrypt.hash(
    process.env.SEED_ANALYST_PASSWORD ||
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2).toUpperCase() + '!@#',
    12
  )
  const viewerPassword = await bcrypt.hash(
    process.env.SEED_VIEWER_PASSWORD ||
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2).toUpperCase() + '!@#',
    12
  )

  // Log generated passwords if not using environment variables
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.log('⚠️  No SEED_ADMIN_PASSWORD env var found. Generated random password.');
    console.log('   Set SEED_ADMIN_PASSWORD in .env to use a specific password.');
  }

  const admin = await prisma.user.upsert({
    where: { email: 'admin@acmewarehouse.com' },
    update: {},
    create: {
      email: 'admin@acmewarehouse.com',
      name: 'Admin User',
      password: adminPassword,
      role: Role.ADMIN,
      organizationId: organization.id,
      settings: {
        theme: 'light',
        notifications: {
          email: true,
          desktop: true
        }
      }
    }
  })

  const analyst = await prisma.user.upsert({
    where: { email: 'analyst@acmewarehouse.com' },
    update: {},
    create: {
      email: 'analyst@acmewarehouse.com',
      name: 'Jane Analyst',
      password: analystPassword,
      role: Role.ANALYST,
      organizationId: organization.id,
      settings: {
        theme: 'dark',
        notifications: {
          email: true,
          desktop: false
        }
      }
    }
  })

  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@acmewarehouse.com' },
    update: {},
    create: {
      email: 'viewer@acmewarehouse.com',
      name: 'Bob Viewer',
      password: viewerPassword,
      role: Role.VIEWER,
      organizationId: organization.id,
      settings: {
        theme: 'light',
        notifications: {
          email: false,
          desktop: false
        }
      }
    }
  })

  console.log(`👥 Created users: ${admin.name}, ${analyst.name}, ${viewer.name}`)

  // Create demo analysis with sample data
  const analysis = await prisma.analysis.create({
    data: {
      fileName: 'demo_inventory_sample.xlsx',
      originalName: 'Q4_2024_Inventory_Export.xlsx',
      fileUrl: 'https://demo-bucket.s3.amazonaws.com/demo_inventory_sample.xlsx',
      fileSize: 2048576, // 2MB
      fileMimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      status: 'COMPLETED',
      progress: 100,
      totalRecords: 15000,
      uniqueUPCs: 12500,
      uniqueProducts: 13000,
      duplicateUPCs: 45,
      multiUPCProducts: 23,
      maxDuplication: 8,
      columnMapping: {
        upc: 'UPC_Code',
        sku: 'Product_ID',
        warehouse: 'Warehouse_Code',
        location: 'Location_Code'
      },
      organizationId: organization.id,
      uploadedById: admin.id,
      settings: {
        autoDetectColumns: true,
        skipEmptyRows: true,
        treatAsText: ['upc', 'productId']
      }
    }
  })

  console.log(`📊 Created demo analysis: ${analysis.fileName}`)

  // Create sample analysis records
  const sampleRecords = [
    // Duplicate UPC examples
    { productId: 'PROD001', warehouseId: 'WH01', upc: '123456789012', location: 'A1-B2-C3' },
    { productId: 'PROD002', warehouseId: 'WH01', upc: '123456789012', location: 'A2-B1-C4' }, // Same UPC, different product
    { productId: 'PROD003', warehouseId: 'WH02', upc: '234567890123', location: 'B1-A2-D1' },
    { productId: 'PROD004', warehouseId: 'WH02', upc: '234567890123', location: 'B2-A1-D2' }, // Same UPC, different product

    // Multi-UPC product examples
    { productId: 'PROD005', warehouseId: 'WH01', upc: '345678901234', location: 'C1-D2-A3' },
    { productId: 'PROD005', warehouseId: 'WH01', upc: '456789012345', location: 'C2-D1-A4' }, // Same product, different UPC
    { productId: 'PROD006', warehouseId: 'WH03', upc: '567890123456', location: 'D1-C2-B3' },
    { productId: 'PROD006', warehouseId: 'WH03', upc: '678901234567', location: 'D2-C1-B4' }, // Same product, different UPC

    // Normal records
    { productId: 'PROD007', warehouseId: 'WH01', upc: '789012345678', location: 'E1-F2-G3' },
    { productId: 'PROD008', warehouseId: 'WH02', upc: '890123456789', location: 'F1-G2-H3' },
    { productId: 'PROD009', warehouseId: 'WH03', upc: '901234567890', location: 'G1-H2-I3' },
    { productId: 'PROD010', warehouseId: 'WH01', upc: '012345678901', location: 'H1-I2-J3' },
  ]

  for (const record of sampleRecords) {
    await prisma.analysisRecord.create({
      data: {
        ...record,
        analysisId: analysis.id,
        rawData: {
          Product_ID: record.productId,
          Warehouse_Code: record.warehouseId,
          UPC_Code: record.upc,
          Location_Code: record.location,
          Description: `Sample product ${record.productId}`,
          Category: 'Electronics',
          Brand: 'ACME Brand'
        }
      }
    })
  }

  console.log(`📄 Created ${sampleRecords.length} sample records`)

  // Create conflicts based on the sample data
  const conflicts = [
    {
      type: ConflictType.DUPLICATE_UPC,
      upc: '123456789012',
      productIds: ['PROD001', 'PROD002'],
      upcs: ['123456789012'],
      locations: ['A1-B2-C3', 'A2-B1-C4'],
      warehouses: ['WH01'],
      severity: Severity.HIGH,
      priority: Priority.HIGH,
      status: ConflictStatus.NEW,
      costImpact: 2500.00,
      description: 'UPC 123456789012 is assigned to multiple products: PROD001, PROD002',
      analysisId: analysis.id,
      organizationId: organization.id
    },
    {
      type: ConflictType.DUPLICATE_UPC,
      upc: '234567890123',
      productIds: ['PROD003', 'PROD004'],
      upcs: ['234567890123'],
      locations: ['B1-A2-D1', 'B2-A1-D2'],
      warehouses: ['WH02'],
      severity: Severity.MEDIUM,
      priority: Priority.MEDIUM,
      status: ConflictStatus.ASSIGNED,
      costImpact: 1800.00,
      description: 'UPC 234567890123 is assigned to multiple products: PROD003, PROD004',
      analysisId: analysis.id,
      organizationId: organization.id,
      assignedToId: analyst.id,
      assignedAt: new Date()
    },
    {
      type: ConflictType.MULTI_UPC_PRODUCT,
      productId: 'PROD005',
      productIds: ['PROD005'],
      upcs: ['345678901234', '456789012345'],
      locations: ['C1-D2-A3', 'C2-D1-A4'],
      warehouses: ['WH01'],
      severity: Severity.LOW,
      priority: Priority.LOW,
      status: ConflictStatus.RESOLVED,
      costImpact: 500.00,
      description: 'Product PROD005 has multiple UPCs: 345678901234, 456789012345',
      resolutionNotes: 'Verified that both UPCs are valid for different package sizes of the same product.',
      analysisId: analysis.id,
      organizationId: organization.id,
      assignedToId: analyst.id,
      resolvedById: analyst.id,
      assignedAt: new Date(Date.now() - 86400000), // 1 day ago
      resolvedAt: new Date(Date.now() - 3600000)   // 1 hour ago
    },
    {
      type: ConflictType.MULTI_UPC_PRODUCT,
      productId: 'PROD006',
      productIds: ['PROD006'],
      upcs: ['567890123456', '678901234567'],
      locations: ['D1-C2-B3', 'D2-C1-B4'],
      warehouses: ['WH03'],
      severity: Severity.CRITICAL,
      priority: Priority.URGENT,
      status: ConflictStatus.IN_PROGRESS,
      costImpact: 5000.00,
      description: 'Product PROD006 has multiple UPCs causing inventory discrepancies: 567890123456, 678901234567',
      analysisId: analysis.id,
      organizationId: organization.id,
      assignedToId: admin.id,
      assignedAt: new Date(Date.now() - 7200000) // 2 hours ago
    }
  ]

  for (const conflict of conflicts) {
    await prisma.conflict.create({ data: conflict })
  }

  console.log(`⚠️  Created ${conflicts.length} sample conflicts`)

  // Create audit logs
  const auditLogs = [
    {
      action: 'ANALYSIS_UPLOADED',
      resource: 'Analysis',
      resourceId: analysis.id,
      details: {
        fileName: analysis.originalName,
        fileSize: analysis.fileSize,
        totalRecords: analysis.totalRecords
      },
      organizationId: organization.id,
      userId: admin.id
    },
    {
      action: 'CONFLICT_ASSIGNED',
      resource: 'Conflict',
      resourceId: conflicts[1].type + '_' + conflicts[1].upc,
      details: {
        conflictType: conflicts[1].type,
        assignedTo: analyst.name,
        severity: conflicts[1].severity
      },
      organizationId: organization.id,
      userId: admin.id
    },
    {
      action: 'CONFLICT_RESOLVED',
      resource: 'Conflict',
      resourceId: conflicts[2].type + '_' + conflicts[2].productId,
      details: {
        conflictType: conflicts[2].type,
        resolvedBy: analyst.name,
        resolution: conflicts[2].resolutionNotes
      },
      organizationId: organization.id,
      userId: analyst.id
    }
  ]

  for (const log of auditLogs) {
    await prisma.auditLog.create({ data: log })
  }

  console.log(`📋 Created ${auditLogs.length} audit log entries`)

  console.log('✅ Database seeded successfully!')
  console.log('\n🔐 Demo Login Credentials:')
  console.log('Admin: admin@acmewarehouse.com / admin123')
  console.log('Analyst: analyst@acmewarehouse.com / analyst123')
  console.log('Viewer: viewer@acmewarehouse.com / viewer123')
  console.log('\n🏢 Organization: ACME Warehouse Corp (acme-warehouse)')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })