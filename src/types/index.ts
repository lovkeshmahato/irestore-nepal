export type UserRole = 'super_admin' | 'admin' | 'front_desk' | 'technician' | 'accountant'

export type JobStatus =
  | 'received'
  | 'diagnosed'
  | 'estimate_sent'
  | 'approved'
  | 'in_repair'
  | 'qc'
  | 'ready_for_pickup'
  | 'delivered'
  | 'declined'

export const JOB_STATUS_FLOW: JobStatus[] = [
  'received',
  'diagnosed',
  'estimate_sent',
  'approved',
  'in_repair',
  'qc',
  'ready_for_pickup',
  'delivered',
]

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  received: 'Received',
  diagnosed: 'Diagnosed',
  estimate_sent: 'Estimate Sent',
  approved: 'Approved by Customer',
  in_repair: 'In Repair',
  qc: 'QC',
  ready_for_pickup: 'Ready for Pickup',
  delivered: 'Delivered',
  declined: 'Declined/Cancelled',
}

export type DeviceCondition = 'good' | 'fair' | 'poor' | 'damaged'
export const DEVICE_CONDITION_LABELS: Record<DeviceCondition, string> = {
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
  damaged: 'Damaged',
}

export type JobPriority = 'normal' | 'high' | 'urgent'
export const JOB_PRIORITY_LABELS: Record<JobPriority, string> = {
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue'
export type WarrantyStatus = 'active' | 'expired' | 'claimed'
export type WarrantyClaimStatus = 'open' | 'in_progress' | 'resolved' | 'rejected'
export type SellRequestStatus =
  | 'new'
  | 'under_review'
  | 'offer_sent'
  | 'negotiating'
  | 'accepted'
  | 'rejected'
  | 'device_received'
  | 'inspected'
  | 'paid_out'

export const SELL_REQUEST_STATUS_FLOW: SellRequestStatus[] = [
  'new',
  'under_review',
  'offer_sent',
  'negotiating',
  'accepted',
  'device_received',
  'inspected',
  'paid_out',
]

export const SELL_REQUEST_STATUS_LABELS: Record<SellRequestStatus, string> = {
  new: 'New',
  under_review: 'Under Review',
  offer_sent: 'Offer Sent',
  negotiating: 'Negotiating',
  accepted: 'Accepted',
  rejected: 'Rejected',
  device_received: 'Device Received',
  inspected: 'Inspected',
  paid_out: 'Paid Out',
}

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  phone: string | null
  avatar_url: string | null
  commission_rate: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  full_name: string
  phone: string
  email: string | null
  address: string | null
  notes: string | null
  merged_into: string | null
  created_at: string
  updated_at: string
}

export interface Device {
  id: string
  customer_id: string
  device_type: string
  model: string
  color: string | null
  serial_number: string | null
  imei: string | null
  created_at: string
  updated_at: string
}

export interface LegacyServiceRecord {
  id: string
  customer_id: string
  device: string
  issue: string
  service_date: string | null
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface ConditionChecklist {
  screen?: boolean
  back_glass?: boolean
  buttons?: boolean
  water_damage?: boolean
  prior_repair_signs?: boolean
}

export interface JobSheet {
  id: string
  job_number: string
  customer_id: string
  device_id: string
  passcode: string | null
  reported_issue: string
  condition_checklist: ConditionChecklist
  accessories_received: string[]
  status: JobStatus
  assigned_technician_id: string | null
  estimated_cost: number | null
  approved_by_customer: boolean | null
  approval_timestamp: string | null
  approval_method: string | null
  warranty_period_days: number | null
  device_condition: DeviceCondition | null
  physical_damage_details: string | null
  icloud_account: string | null
  security_notes: string | null
  estimated_completion_date: string | null
  priority: JobPriority
  created_by: string | null
  created_at: string
  updated_at: string
  delivered_at: string | null
  customers?: Customer
  devices?: Device
}

export interface JobStatusHistory {
  id: string
  job_sheet_id: string
  status: JobStatus
  changed_by: string | null
  notes: string | null
  created_at: string
  profiles?: Profile
}

export interface JobPhoto {
  id: string
  job_sheet_id: string
  stage: 'before' | 'after'
  storage_path: string
  caption: string | null
  created_at: string
}

export interface JobNote {
  id: string
  job_sheet_id: string
  author_id: string | null
  note: string
  created_at: string
  profiles?: Profile
}

export interface Part {
  id: string
  name: string
  category: string | null
  compatible_models: string[]
  part_type: 'genuine' | 'oem' | 'compatible'
  cost_price: number
  sale_price: number
  stock_qty: number
  reorder_threshold: number
  is_serialized: boolean
  created_at: string
  updated_at: string
}

export interface PartSerial {
  id: string
  part_id: string
  serial_number: string
  status: 'in_stock' | 'used' | 'damaged' | 'returned'
  job_sheet_id: string | null
  created_at: string
}

export interface JobPartUsed {
  id: string
  job_sheet_id: string
  part_id: string
  part_serial_id: string | null
  quantity: number
  unit_cost: number
  unit_price: number
  created_at: string
  parts?: Part
}

export interface StockMovement {
  id: string
  part_id: string
  movement_type: 'received' | 'used' | 'adjusted' | 'damaged' | 'sold_retail'
  quantity: number
  reference_type: string | null
  reference_id: string | null
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface Invoice {
  id: string
  invoice_number: string
  customer_id: string
  job_sheet_id: string | null
  pan_vat_number: string | null
  vat_enabled: boolean
  vat_rate: number
  subtotal: number
  vat_amount: number
  total: number
  amount_paid: number
  balance_due: number
  status: InvoiceStatus
  notes: string | null
  repair_charge: number
  parts_cost: number
  labour_charge: number
  discount_type: 'fixed' | 'percent'
  discount_value: number
  discount_amount: number
  payment_method: string | null
  doc_show_vat: boolean
  doc_show_logo: boolean
  doc_show_address: boolean
  doc_show_phone: boolean
  doc_show_email: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  customers?: Customer
  job_sheets?: { job_number: string }
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  description: string
  item_type: 'part' | 'labor' | 'other'
  quantity: number
  unit_price: number
  total: number
  created_at: string
}

export interface Payment {
  id: string
  invoice_id: string
  amount: number
  method: 'cash' | 'esewa' | 'khalti' | 'bank_transfer' | 'card'
  reference_note: string | null
  paid_at: string
  received_by: string | null
  created_at: string
}

export interface CreditNote {
  id: string
  invoice_id: string
  amount: number
  reason: string
  created_by: string | null
  created_at: string
}

export interface Warranty {
  id: string
  job_sheet_id: string
  warranty_type: 'part' | 'labor'
  part_id: string | null
  coverage_description: string | null
  period_days: number
  start_date: string
  end_date: string
  status: WarrantyStatus
  created_at: string
  job_sheets?: JobSheet
}

export interface WarrantyClaim {
  id: string
  warranty_id: string
  original_job_sheet_id: string
  rework_job_sheet_id: string | null
  issue_description: string
  status: WarrantyClaimStatus
  created_by: string | null
  created_at: string
  resolved_at: string | null
}

export interface Vendor {
  id: string
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  items_supplied: string | null
  created_at: string
  updated_at: string
}

export interface PurchaseOrder {
  id: string
  po_number: string
  vendor_id: string
  status: 'draft' | 'ordered' | 'received' | 'cancelled'
  total_amount: number
  payment_status: 'paid' | 'partial' | 'due'
  amount_paid: number
  created_by: string | null
  created_at: string
  received_at: string | null
  vendors?: Vendor
}

export interface POItem {
  id: string
  po_id: string
  part_id: string
  quantity: number
  unit_cost: number
  parts?: Part
}

export interface SellRequest {
  id: string
  request_number: string
  seller_name: string
  seller_phone: string
  seller_email: string | null
  device_type: string
  model: string
  color: string | null
  storage_capacity: string | null
  condition_self_report: Record<string, boolean>
  accessories: string[]
  device_issues: string[]
  issue_details: string | null
  additional_details: string | null
  status: SellRequestStatus
  offer_price: number | null
  offer_notes: string | null
  created_at: string
  updated_at: string
}

export const DEVICE_ISSUE_OPTIONS = [
  'Screen Damage',
  'Battery Issue',
  'Water Damage',
  'Button/Port Issue',
  'Software Issue',
  'No Known Issues',
  'Other',
] as const

export interface StaffAttendance {
  id: string
  staff_id: string
  date: string
  check_in: string | null
  check_out: string | null
  status: 'present' | 'absent' | 'half_day' | 'leave'
  created_at: string
}

export interface Settings {
  id: string
  business_name: string
  address: string | null
  pan_vat_number: string | null
  phone: string | null
  email: string | null
  logo_url: string | null
  warranty_defaults: Record<string, number>
  invoice_prefix: string
  invoice_next_number: number
  job_sheet_prefix: string
  job_sheet_next_number: number
  low_stock_threshold_default: number
  overdue_reminder_days: number
  default_tax_rate: number
  print_header_alignment: 'left' | 'center'
  terms_conditions_text: string
  updated_at: string
}

export interface VendorPayment {
  id: string
  vendor_id: string
  po_id: string | null
  amount: number
  method: string
  is_advance: boolean
  payment_date: string
  notes: string | null
  created_by: string | null
  created_at: string
  purchase_orders?: { po_number: string }
}
