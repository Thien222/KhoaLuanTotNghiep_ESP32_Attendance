# UML Class Diagram - HR Management System

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    HRM SYSTEM - CLASS DIAGRAM                                    │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────┐          1      1 ┌────────────────────────┐
│         User           │◆─────────────────│       Employee         │
├────────────────────────┤                   ├────────────────────────┤
│ «PK» _id: ObjectId     │                   │ «PK» _id: ObjectId     │
│ - username: String «U» │                   │ - employeeId: String «U»│
│ - email: String «U»    │                   │ - name: String         │
│ - password: String     │                   │ - email: String «U»    │
│ - role: String (enum)  │                   │ - phone: String        │
│ «FK» employee: ObjectId│                   │ - position: String     │
│ - isActive: Boolean    │                   │ - department: String   │
│ - lastLogin: Date      │                   │ - fingerprintId: Number«U»│
├────────────────────────┤                   │ - fingerprintEnrolled: │
│ + comparePassword()    │                   │   Boolean              │
│ + toJSON()             │                   │ - salary: Number       │
└────────────────────────┘                   │ - baseSalary: Number   │
     │                                       │ - contractType: String │
     │ role: employee|accountant|manager     │   (enum)               │
     │                                       │ - status: String (enum)│
     │                                       │ - leaveQuotas: Object  │
     │                                       │ - seniorityYears: Number│
     │                                       ├────────────────────────┤
     │                                       │ + updateSeniority()    │
     │                                       │ + increaseSalary()     │
     │                                       └────────────────────────┘
     │                                            │ 1
     │                                            │
     │                           ┌────────────────┼────────────────┬──────────────────┐
     │                           │                │                │                  │
     │                           ▼ *              ▼ *              ▼ *                ▼ *
     │               ┌──────────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────────┐
     │               │   Attendance     │ │    Leave     │ │   Payroll    │ │ OvertimeRequest │
     │               ├──────────────────┤ ├──────────────┤ ├──────────────┤ ├─────────────────┤
     │               │«PK» _id: ObjectId│ │«PK» _id:     │ │«PK» _id:     │ │«PK» _id:        │
     │               │«FK» employee:    │ │  ObjectId    │ │  ObjectId    │ │  ObjectId       │
     │               │  ObjectId        │ │«FK» employee:│ │«FK» employee:│ │«FK» employee:   │
     │               │ - date: Date     │ │  ObjectId    │ │  ObjectId    │ │  ObjectId       │
     │               │ - checkIn: {     │ │ - leaveType: │ │ - month: String│ │ - date: Date   │
     │               │   time: Date,    │ │   String     │ │   «U»        │ │ - startTime:   │
     │               │   status: String}│ │ - startDate: │ │ - baseSalary:│ │   String (HH:mm│
     │               │ - checkOut: {    │ │   Date       │ │   Number     │ │ - endTime:     │
     │               │   time: Date,    │ │ - endDate:   │ │ - overtimePay│ │   String (HH:mm│
     │               │   status: String}│ │   Date       │ │   Number     │ │ - estimated-   │
     │               │ - workingHours:  │ │ - totalDays: │ │ - bonus:     │ │   Hours: Number│
     │               │   Number (hours) │ │   Number     │ │   Number     │ │ - reason: String│
     │               │ - status: String │ │ - reason:    │ │ - netSalary: │ │«FK» shift:      │
     │               │   (enum)         │ │   String     │ │   Number     │ │  ObjectId       │
     │               │ - lateMinutes:   │ │ - status:    │ │ - taxAmount: │ │ - status: String│
     │               │   Number         │ │   String     │ │   Number     │ │   (enum)        │
     │               │ - overtimeHours: │ │«FK» reviewedBy│ │ - status:    │ │«FK» reviewedBy: │
     │  reviews      │   Number (hours) │ │  ObjectId    │ │   String     │ │  ObjectId       │
     └───────────────└──────────────────┘ └──────────────┘ ├──────────────┤ └─────────────────┘
                                                           │ + calculate()│
                                                           └──────────────┘
                                                           «U» = Unique: (employee + month)

┌────────────────────┐    ┌────────────────────┐
│       Shift        │    │     Settings       │
├────────────────────┤    ├────────────────────┤
│ «PK» _id: ObjectId │    │ «PK» _id: ObjectId │
│ - name: String «U» │    │ - type: String «U» │
│ - startTime: String│    │ - config: Object   │
│   (HH:mm)          │    │ - isActive: Boolean│
│ - endTime: String  │    └────────────────────┘
│   (HH:mm)          │
│ - gracePeriod:     │
│   Number (minutes) │
│ - isActive: Boolean│
└────────────────────┘
         │ 1
         │
         ▼ *
┌────────────────────┐              ┌────────────────────┐       ┌──────────────────────┐
│   EmployeeShift    │              │    ESP32Config     │       │ TerminatedEmployee   │
├────────────────────┤              ├────────────────────┤       ├──────────────────────┤
│ «PK» _id: ObjectId │              │ «PK» _id: ObjectId │       │ «PK» _id: ObjectId   │
│«FK» employee:      │              │ - esp32Ip: String  │       │ - originalEmployeeId:│
│  ObjectId          │              │   «U»              │       │   ObjectId           │
│«FK» shift: ObjectId│              │ - serverUrl: String│       │ - employeeId: String │
│ - startDate: Date  │              │ - status: String   │       │ - name: String       │
│ - endDate: Date    │              │ - lastSeen: Date   │       │ - terminationDate:   │
│ - isActive: Boolean│              └────────────────────┘       │   Date               │
└────────────────────┘                                           │ - terminationReason: │
                                                                 │   String (enum)      │
                                                                 └──────────────────────┘


═══════════════════════════════════════════════════════════════════════════════════════
                                  RELATIONSHIPS
═══════════════════════════════════════════════════════════════════════════════════════

 ┌────────────┐ 1        1 ┌──────────────┐
 │    User    │◆──────────│   Employee   │   User - Employee: 1-1 (Composition)
 └────────────┘            └──────────────┘   FK: User.employee → Employee._id

 ┌──────────────┐ 1      * ┌──────────────┐
 │   Employee   │─────────│  Attendance  │   Employee - Attendance: 1-N
 └──────────────┘          └──────────────┘   FK: Attendance.employee → Employee._id

 ┌──────────────┐ 1      * ┌──────────────┐
 │   Employee   │─────────│    Leave     │   Employee - Leave: 1-N
 └──────────────┘          └──────────────┘   FK: Leave.employee → Employee._id

 ┌──────────────┐ 1      * ┌──────────────┐
 │   Employee   │─────────│   Payroll    │   Employee - Payroll: 1-N
 └──────────────┘          └──────────────┘   FK: Payroll.employee → Employee._id
                                              Unique: (employee + month)

 ┌──────────────┐ 1      * ┌───────────────────┐
 │   Employee   │─────────│  OvertimeRequest  │   Employee - OvertimeRequest: 1-N
 └──────────────┘          └───────────────────┘   FK: OvertimeRequest.employee → Employee._id

 ┌──────────────┐ *      * ┌──────────────┐
 │   Employee   │─────────│    Shift     │   Employee - Shift: N-N (via EmployeeShift)
 └──────────────┘          └──────────────┘   FK: EmployeeShift.employee → Employee._id
         ╲                       ╱              FK: EmployeeShift.shift → Shift._id
          ╲                     ╱
           ▼                   ▼
      ┌────────────────────┐
      │  EmployeeShift     │   Junction Table (N-N Relationship)
      └────────────────────┘

 ┌──────────────┐ 1      * ┌──────────────┐
 │     User     │─────────│    Leave     │   User reviews Leave: 1-N
 └──────────────┘          └──────────────┘   FK: Leave.reviewedBy → User._id

 ┌──────────────┐ 1      * ┌───────────────────┐
 │     User     │─────────│  OvertimeRequest  │   User reviews OvertimeRequest: 1-N
 └──────────────┘          └───────────────────┘   FK: OvertimeRequest.reviewedBy → User._id

 ┌──────────────┐ 1      1 ┌──────────────────────┐
 │   Employee   │ ─ ─ ─ ─▷│ TerminatedEmployee   │   Employee → TerminatedEmployee (Archive)
 └──────────────┘          └──────────────────────┘   FK: TerminatedEmployee.originalEmployeeId


═══════════════════════════════════════════════════════════════════════════════════════
                                  PRIMARY KEYS (PK)
═══════════════════════════════════════════════════════════════════════════════════════

All entities use MongoDB's default ObjectId as Primary Key:
  - User: _id
  - Employee: _id
  - Attendance: _id
  - Leave: _id
  - OvertimeRequest: _id
  - Payroll: _id
  - Shift: _id
  - EmployeeShift: _id
  - Holiday: _id
  - Settings: _id
  - ESP32Config: _id
  - TerminatedEmployee: _id


═══════════════════════════════════════════════════════════════════════════════════════
                               FOREIGN KEYS (FK)
═══════════════════════════════════════════════════════════════════════════════════════

User:
  - employee → Employee._id (1-1)

Attendance:
  - employee → Employee._id (N-1)

Leave:
  - employee → Employee._id (N-1)
  - reviewedBy → User._id (N-1, optional)

OvertimeRequest:
  - employee → Employee._id (N-1)
  - shift → Shift._id (N-1, optional)
  - reviewedBy → User._id (N-1, optional)

Payroll:
  - employee → Employee._id (N-1)

EmployeeShift:
  - employee → Employee._id (N-1)
  - shift → Shift._id (N-1)

TerminatedEmployee:
  - originalEmployeeId → Employee._id (reference, not enforced)


═══════════════════════════════════════════════════════════════════════════════════════
                               UNIQUE CONSTRAINTS
═══════════════════════════════════════════════════════════════════════════════════════

User:
  - username (unique)
  - email (unique)

Employee:
  - employeeId (unique)
  - email (unique)
  - fingerprintId (unique, sparse - allows null)

Shift:
  - name (unique)

ESP32Config:
  - esp32Ip (unique)

Settings:
  - type (unique)

Payroll:
  - Composite unique: (employee + month)


═══════════════════════════════════════════════════════════════════════════════════════
                                     ENUMS
═══════════════════════════════════════════════════════════════════════════════════════

User.role:        ['employee', 'accountant', 'manager']
Employee.status:  ['active', 'inactive']
Employee.contractType: ['intern', 'probation', 'official']
Employee.gender:  ['male', 'female', 'other']
Attendance.status: ['present', 'absent', 'half-day']
Leave.leaveType:  ['annual', 'sick', 'unpaid', 'maternity', 'other']
Leave.status:     ['pending', 'approved', 'rejected', 'cancelled']
Payroll.status:   ['draft', 'calculated', 'reviewed', 'approved', 'paid', 'cancelled']
OvertimeRequest.status: ['pending', 'approved', 'rejected']
TerminatedEmployee.terminationReason: ['resigned', 'terminated', 'contract_ended', 'retirement', 'other']


═══════════════════════════════════════════════════════════════════════════════════════
                                     NOTES
═══════════════════════════════════════════════════════════════════════════════════════

Legend:
  «PK»  = Primary Key
  «FK»  = Foreign Key
  «U»   = Unique constraint
  ◆     = Composition (strong ownership)
  *     = Many (0..*)
  1     = One (exactly 1)
  ─ ─ ▷ = Dependency (weak reference)

```
