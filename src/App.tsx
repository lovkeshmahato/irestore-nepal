import { Routes, Route } from 'react-router-dom'
import { ProtectedRoute, RoleRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'

import { Login } from './pages/auth/Login'
import { ForgotPassword } from './pages/auth/ForgotPassword'
import { Dashboard } from './pages/Dashboard'

import { CustomersList } from './pages/customers/CustomersList'
import { CustomerDetail } from './pages/customers/CustomerDetail'

import { JobSheetsList } from './pages/job-sheets/JobSheetsList'
import { JobSheetNew } from './pages/job-sheets/JobSheetNew'
import { JobSheetDetail } from './pages/job-sheets/JobSheetDetail'

import { InvoicesList } from './pages/invoices/InvoicesList'
import { InvoiceNew } from './pages/invoices/InvoiceNew'
import { InvoiceDetail } from './pages/invoices/InvoiceDetail'

import { InventoryList } from './pages/inventory/InventoryList'
import { VendorsList } from './pages/vendors/VendorsList'
import { VendorDetail } from './pages/vendors/VendorDetail'

import { WarrantiesList } from './pages/warranties/WarrantiesList'

import { SellRequestsList } from './pages/sell-requests/SellRequestsList'
import { SellRequestDetail } from './pages/sell-requests/SellRequestDetail'
import { RefurbList } from './pages/sell-requests/RefurbList'

import { AppointmentsList } from './pages/appointments/AppointmentsList'
import { StaffList } from './pages/staff/StaffList'
import { Reports } from './pages/reports/Reports'
import { Settings } from './pages/settings/Settings'

import { SellYourDevice } from './pages/public/SellYourDevice'
import { TrackRepair } from './pages/public/TrackRepair'
import { BookAppointment } from './pages/public/BookAppointment'

import { JobSheetPrint } from './print/JobSheetPrint'
import { InvoicePrint } from './print/InvoicePrint'
import { WarrantyPrint } from './print/WarrantyPrint'
import { BuybackPrint } from './print/BuybackPrint'

function App() {
  return (
    <Routes>
      {/* Public, no-auth pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/sell-your-device" element={<SellYourDevice />} />
      <Route path="/track-repair" element={<TrackRepair />} />
      <Route path="/book-appointment" element={<BookAppointment />} />

      {/* Print views: full-page, no sidebar chrome, still login-gated */}
      <Route element={<ProtectedRoute />}>
        <Route path="/print/job-sheet/:id" element={<JobSheetPrint />} />
        <Route path="/print/invoice/:id" element={<InvoicePrint />} />
        <Route path="/print/warranty/:id" element={<WarrantyPrint />} />
        <Route path="/print/buyback/:id" element={<BuybackPrint />} />
      </Route>

      {/* Authenticated app */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />

          <Route element={<RoleRoute roles={['super_admin', 'admin', 'front_desk', 'accountant']} />}>
            <Route path="/customers" element={<CustomersList />} />
            <Route path="/customers/:id" element={<CustomerDetail />} />
          </Route>

          <Route path="/job-sheets" element={<JobSheetsList />} />
          <Route path="/job-sheets/:id" element={<JobSheetDetail />} />
          <Route element={<RoleRoute roles={['super_admin', 'admin', 'front_desk']} />}>
            <Route path="/job-sheets/new" element={<JobSheetNew />} />
          </Route>

          <Route element={<RoleRoute roles={['super_admin', 'admin', 'front_desk', 'accountant']} />}>
            <Route path="/invoices" element={<InvoicesList />} />
            <Route path="/invoices/:id" element={<InvoiceDetail />} />
          </Route>
          <Route element={<RoleRoute roles={['super_admin', 'admin', 'front_desk']} />}>
            <Route path="/invoices/new" element={<InvoiceNew />} />
          </Route>

          <Route element={<RoleRoute roles={['super_admin', 'admin', 'front_desk', 'accountant']} />}>
            <Route path="/warranties" element={<WarrantiesList />} />
          </Route>

          <Route element={<RoleRoute roles={['super_admin', 'admin']} />}>
            <Route path="/inventory" element={<InventoryList />} />
          </Route>
          <Route element={<RoleRoute roles={['super_admin', 'admin', 'accountant']} />}>
            <Route path="/vendors" element={<VendorsList />} />
            <Route path="/vendors/:id" element={<VendorDetail />} />
          </Route>

          <Route element={<RoleRoute roles={['super_admin', 'admin', 'front_desk']} />}>
            <Route path="/sell-requests" element={<SellRequestsList />} />
            <Route path="/sell-requests/:id" element={<SellRequestDetail />} />
            <Route path="/refurb" element={<RefurbList />} />
            <Route path="/appointments" element={<AppointmentsList />} />
          </Route>

          <Route element={<RoleRoute roles={['super_admin', 'admin']} />}>
            <Route path="/staff" element={<StaffList />} />
          </Route>
          <Route element={<RoleRoute roles={['super_admin', 'admin', 'accountant']} />}>
            <Route path="/reports" element={<Reports />} />
          </Route>
          <Route element={<RoleRoute roles={['super_admin']} />}>
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}

export default App
