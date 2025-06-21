# AIVF SaaS App - TODO List

This file outlines the next steps for building the AIVF SaaS application. The UI has been scaffolded, and the following backend and integration tasks are next.

## Backend Development

### 1. Database Setup
- [ ] Initialize Prisma with a PostgreSQL provider.
- [ ] Define the database schema in `prisma/schema.prisma`.
  - `User` model (with roles: CLINIC_ADMIN, PATIENT)
  - `Clinic` model (for multi-tenancy)
  - `PatientProfile` model
  - `MedicalDocument` model
  - `Appointment` model
  - `Injection` model
  - `MoodLog` model
  - `ChatMessage` model
- [ ] Run initial database migration.

### 2. Authentication
- [ ] Install and configure NextAuth.js.
- [ ] Set up credentials provider for email/password login.
- [ ] Create API routes for registration (`/api/auth/register`).
- [ ] Protect pages and API routes based on user role and session.
- [ ] Implement logic to associate patients with clinics (`clinicId`).

### 3. API Route Implementation
- **Clinic Routes (`/app/api/clinic`)**
  - [ ] `patients`: CRUD operations for patients.
  - [ ] `documents`: Handle document uploads (to a service like S3), trigger OCR parsing, and manage document metadata.
  - [ ] `dashboard`: Fetch analytics for the clinic dashboard.
- **Patient Routes (`/app/api/patient`)**
  - [ ] `schedule`: Fetch personalized injection/appointment schedules.
  - [ ] `mood`: Log and retrieve mood/symptom data.
  - [ ] `chat`: Handle chatbot messages, integrate with OpenAI and a vector database for memory.
  - [ ] `dashboard`: Fetch data for the patient dashboard.
  - [ ] `alerts`: Handle emergency alerts.

## AI & Integrations

- [ ] **OCR for Documents**:
  - Choose and integrate an OCR service (e.g., Google Cloud Vision, AWS Textract).
  - Implement a service to parse the extracted text for relevant medical information.
- [ ] **AI Chatbot**:
  - Set up OpenAI API.
  - Choose and set up a vector database (e.g., Pinecone, Vercel KV).
  - Implement logic for creating embeddings and retrieving chat history for context.

## Frontend & Integration

- [ ] Replace placeholder data on all pages with data fetched from the API.
- [ ] Implement form submission logic for login, registration, patient onboarding, etc.
- [ ] Add loading states and error handling for all data-fetching and mutation operations.
- [ ] Replace placeholder images (`/placeholder.svg`, `/bot-avatar.png`) with actual assets.
- [ ] Implement real-time features (e.g., notifications) if desired.
- [ ] Thoroughly test role-based access control to ensure data isolation.

## Deployment
- [ ] Set up production database and storage.
- [ ] Configure environment variables for production.
- [ ] Deploy to a hosting provider like Vercel. 