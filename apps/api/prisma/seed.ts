import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed with synthetic clinical data...');

  // Clean existing records in reverse dependency order
  await prisma.consultationRecord.deleteMany();
  await prisma.triageOverride.deleteMany();
  await prisma.triageAssessment.deleteMany();
  await prisma.queueEntry.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Departments
  const departmentsData = [
    { code: 'CARD', name: 'Cardiology', avgConsultationMinutes: 22 },
    { code: 'ORTH', name: 'Orthopedics', avgConsultationMinutes: 16 },
    { code: 'PEDI', name: 'Pediatrics', avgConsultationMinutes: 18 },
    { code: 'GENM', name: 'General Medicine', avgConsultationMinutes: 14 },
    { code: 'DERM', name: 'Dermatology', avgConsultationMinutes: 12 },
  ];

  const departments: Record<string, any> = {};
  for (const dept of departmentsData) {
    departments[dept.code] = await prisma.department.create({ data: dept });
  }
  console.log(` Created ${Object.keys(departments).length} clinical departments.`);

  // 2. Administrative & Staff Users
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@opd.org',
      fullName: 'System Administrator',
      passwordHash,
      role: 'ADMIN',
    },
  });

  const receptionUser = await prisma.user.create({
    data: {
      email: 'reception@opd.org',
      fullName: 'Receptionist Desk Staff',
      passwordHash,
      role: 'RECEPTIONIST',
    },
  });

  // 3. Doctors
  const doctorsData = [
    {
      email: 'dr.sharma@opd.org',
      fullName: 'Dr. Rajesh Sharma',
      deptCode: 'CARD',
      specialization: 'Interventional Cardiology',
      experienceYears: 14,
      roomNumber: 'OPD-101',
    },
    {
      email: 'dr.patel@opd.org',
      fullName: 'Dr. Priya Patel',
      deptCode: 'ORTH',
      specialization: 'Joint Replacement & Trauma',
      experienceYears: 10,
      roomNumber: 'OPD-102',
    },
    {
      email: 'dr.ananya@opd.org',
      fullName: 'Dr. Ananya Iyer',
      deptCode: 'PEDI',
      specialization: 'General Pediatrics',
      experienceYears: 8,
      roomNumber: 'OPD-103',
    },
    {
      email: 'dr.verma@opd.org',
      fullName: 'Dr. Vikram Verma',
      deptCode: 'GENM',
      specialization: 'Internal Medicine',
      experienceYears: 12,
      roomNumber: 'OPD-104',
    },
  ];

  const doctors: Record<string, any> = {};
  for (const doc of doctorsData) {
    const user = await prisma.user.create({
      data: {
        email: doc.email,
        fullName: doc.fullName,
        passwordHash,
        role: 'DOCTOR',
      },
    });

    doctors[doc.email] = await prisma.doctor.create({
      data: {
        userId: user.id,
        departmentId: departments[doc.deptCode].id,
        specialization: doc.specialization,
        experienceYears: doc.experienceYears,
        roomNumber: doc.roomNumber,
        isAvailable: true,
      },
    });
  }
  console.log(` Created ${Object.keys(doctors).length} doctor profiles.`);

  // 4. Patients
  const patientsData = [
    {
      email: 'patient.john@opd.org',
      fullName: 'John Miller',
      mrn: 'MRN-2026-0001',
      gender: 'MALE',
      dateOfBirth: new Date('1982-04-12'),
      phone: '+1-555-0101',
      bloodGroup: 'O+',
      emergencyContact: 'Sarah Miller (+1-555-0102)',
    },
    {
      email: 'patient.mary@opd.org',
      fullName: 'Mary Davis',
      mrn: 'MRN-2026-0002',
      gender: 'FEMALE',
      dateOfBirth: new Date('1994-08-23'),
      phone: '+1-555-0103',
      bloodGroup: 'A+',
      emergencyContact: 'Tom Davis (+1-555-0104)',
    },
    {
      email: 'patient.david@opd.org',
      fullName: 'David Wilson',
      mrn: 'MRN-2026-0003',
      gender: 'MALE',
      dateOfBirth: new Date('1968-11-05'),
      phone: '+1-555-0105',
      bloodGroup: 'B+',
      emergencyContact: 'Emma Wilson (+1-555-0106)',
    },
    {
      email: 'patient.sophia@opd.org',
      fullName: 'Sophia Martinez',
      mrn: 'MRN-2026-0004',
      gender: 'FEMALE',
      dateOfBirth: new Date('2001-02-14'),
      phone: '+1-555-0107',
      bloodGroup: 'AB+',
      emergencyContact: 'Carlos Martinez (+1-555-0108)',
    },
    {
      email: 'patient.aarav@opd.org',
      fullName: 'Aarav Gupta',
      mrn: 'MRN-2026-0005',
      gender: 'MALE',
      dateOfBirth: new Date('2018-06-30'),
      phone: '+1-555-0109',
      bloodGroup: 'O-',
      emergencyContact: 'Neha Gupta (+1-555-0110)',
    },
  ];

  const patients: Record<string, any> = {};
  for (const pat of patientsData) {
    const user = await prisma.user.create({
      data: {
        email: pat.email,
        fullName: pat.fullName,
        passwordHash,
        role: 'PATIENT',
      },
    });

    patients[pat.email] = await prisma.patient.create({
      data: {
        userId: user.id,
        medicalRecordNumber: pat.mrn,
        fullName: pat.fullName,
        gender: pat.gender,
        dateOfBirth: pat.dateOfBirth,
        phone: pat.phone,
        bloodGroup: pat.bloodGroup,
        emergencyContact: pat.emergencyContact,
      },
    });
  }
  console.log(` Created ${Object.keys(patients).length} patient profiles.`);

  // 5. Appointments & Queue Entries for Today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Appointment 1: Checked in (Cardiology, Tier 2 - High Urgency)
  const appt1 = await prisma.appointment.create({
    data: {
      patientId: patients['patient.david@opd.org'].id,
      doctorId: doctors['dr.sharma@opd.org'].id,
      departmentId: departments['CARD'].id,
      scheduledAt: new Date(Date.now() - 45 * 60 * 1000),
      status: 'CHECKED_IN',
      reason: 'Sudden onset chest tightness and dyspnea',
    },
  });

  const queueEntry1 = await prisma.queueEntry.create({
    data: {
      appointmentId: appt1.id,
      departmentId: departments['CARD'].id,
      doctorId: doctors['dr.sharma@opd.org'].id,
      queueDate: today,
      tokenNumber: 1,
      tokenDisplay: 'CARD-001',
      status: 'WAITING',
      initialTriageTier: 2,
      currentTriageTier: 2,
      dynamicPriorityScore: 165.0, // 120 base + 45 mins wait
      checkInTime: new Date(Date.now() - 45 * 60 * 1000),
      estimatedWaitMinutes: 8,
      waitTimePredictionSource: 'ML_MODEL',
    },
  });

  await prisma.triageAssessment.create({
    data: {
      queueEntryId: queueEntry1.id,
      systolicBP: 168,
      diastolicBP: 102,
      heartRate: 118,
      oxygenSaturation: 91.5,
      temperatureCelsius: 37.2,
      painScore: 8,
      respiratoryDistress: true,
      alteredMentalState: false,
      calculatedTier: 2,
      explanation: 'Emergent: Significant desaturation (SpO2 91.5% < 92%) and severe chest discomfort (Pain 8/10).',
    },
  });

  // Appointment 2: Checked in (Cardiology, Tier 4 - Routine Followup)
  const appt2 = await prisma.appointment.create({
    data: {
      patientId: patients['patient.john@opd.org'].id,
      doctorId: doctors['dr.sharma@opd.org'].id,
      departmentId: departments['CARD'].id,
      scheduledAt: new Date(Date.now() - 60 * 60 * 1000),
      status: 'CHECKED_IN',
      reason: 'Routine quarterly hypertension checkup',
    },
  });

  const queueEntry2 = await prisma.queueEntry.create({
    data: {
      appointmentId: appt2.id,
      departmentId: departments['CARD'].id,
      doctorId: doctors['dr.sharma@opd.org'].id,
      queueDate: today,
      tokenNumber: 2,
      tokenDisplay: 'CARD-002',
      status: 'WAITING',
      initialTriageTier: 4,
      currentTriageTier: 4,
      dynamicPriorityScore: 95.0, // 35 base + 60 mins wait
      checkInTime: new Date(Date.now() - 60 * 60 * 1000),
      estimatedWaitMinutes: 28,
      waitTimePredictionSource: 'ML_MODEL',
    },
  });

  await prisma.triageAssessment.create({
    data: {
      queueEntryId: queueEntry2.id,
      systolicBP: 132,
      diastolicBP: 84,
      heartRate: 74,
      oxygenSaturation: 98.0,
      temperatureCelsius: 36.8,
      painScore: 1,
      respiratoryDistress: false,
      alteredMentalState: false,
      calculatedTier: 4,
      explanation: 'Routine: Stable vitals; blood pressure controlled on medication.',
    },
  });

  // Appointment 3: Orthopedics (Scheduled)
  await prisma.appointment.create({
    data: {
      patientId: patients['patient.mary@opd.org'].id,
      doctorId: doctors['dr.patel@opd.org'].id,
      departmentId: departments['ORTH'].id,
      scheduledAt: new Date(Date.now() + 60 * 60 * 1000),
      status: 'SCHEDULED',
      reason: 'Right knee stiffness following sports injury',
    },
  });

  // Appointment 4: Pediatrics (Scheduled)
  await prisma.appointment.create({
    data: {
      patientId: patients['patient.aarav@opd.org'].id,
      doctorId: doctors['dr.ananya@opd.org'].id,
      departmentId: departments['PEDI'].id,
      scheduledAt: new Date(Date.now() + 120 * 60 * 1000),
      status: 'SCHEDULED',
      reason: 'Child immunization schedule (MMR booster)',
    },
  });

  console.log('✅ Synthetic seed data successfully loaded into database!');
}

main()
  .catch((e) => {
    console.error('❌ Error executing database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
