
# Privacy-Preserving Asset Manager: AI-Driven Classification with Secure E2EE & ABAC

### 🛡️ Project Overview
The **Privacy-Preserving Asset Manager** is a zero-knowledge, high-security platform designed to manage sensitive digital assets without compromising data confidentiality. Developed by **Ayush Supakar**, this project solves the "AI Privacy Paradox"—the risk of exposing plaintext data to AI models for the sake of organization—by combining **Client-Side End-to-End Encryption (E2EE)** with **Local AI Inference** and **Attribute-Based Access Control (ABAC)**.

### 🚀 Key Significance
* **Zero-Knowledge Architecture**: Files are encrypted in the user's browser using the **Web Crypto API (AES-GCM)** before being transmitted. The server only ever handles encrypted "blobs" and has no access to raw data or decryption keys.
* **Privacy-Aware AI**: Instead of reading file contents, a local **NLP model (`facebook/bart-large-mnli`)** analyzes user-provided summaries to categorize files and determine sensitivity levels (High, Medium, Low).
* **Contextual Security (ABAC)**: Implements a dual-policy engine that evaluates real-time variables such as **IP address**, **Department**, and **Time of Access** to prevent unauthorized contextual entry.
* **System Audit Trail**: A full-stack implementation that records every access request—detailing the timestamp, user, action, and specific policy reason for approval or denial.

### 🛠️ Technical Stack
* **Frontend**: React (Vite), Tailwind CSS, Web Crypto API.
* **Backend**: Python FastAPI, SQLAlchemy (SQLite), Pydantic.
* **AI/ML**: Hugging Face Transformers (Zero-Shot Classification), PyTorch.
* **Security**: JWT Authentication, PBKDF2 Password Hashing, Multi-Factor Authentication (MFA).

### 📂 Project Structure

```text
privacy-asset-manager/
├── backend/                  # FastAPI Backend
│   ├── app/
│   │   ├── api/              # Auth, Files, & Audit endpoints
│   │   ├── core/             # Security & ABAC/RBAC logic
│   │   ├── models.py         # SQLAlchemy Database Schemas
│   │   └── services/         # Local AI classifier service
│   └── run.py                # Server entry point
└── frontend/                 # React Frontend
    ├── src/
    │   ├── components/       # UI (Dashboard, Upload, Audit Trail)
    │   ├── services/         # API & Crypto (AES-GCM) wrappers
    │   └── styles.css        # Custom Enterprise SaaS Design System
```

### ⚙️ Installation & Setup

#### 1. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python run.py
```
* **Note**: On the first run, the system will download the AI model (~1.6GB) for local inference.

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
* Access the application at `http://localhost:5173`.

### 🧪 Demo Credentials
| Role | Username | Password | MFA Code |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | `123456` |
| **Employee** | `finance_emp` | `finance123` | `123456` |
| **Guest** | `guest1` | `guest123` | `123456` |

### 📊 Security Metrics
* **ABAC Precision**: Measures the system's ability to block unauthorized access based on context (e.g., non-business hours).
* **E2EE Overhead**: Evaluates the latency of browser-side encryption compared to standard uploads.
* **AI Categorization Accuracy**: Assesses the zero-shot model's ability to correctly tag sensitive documents across departments.

<img width="1365" height="646" alt="AISOC 1" src="https://github.com/user-attachments/assets/df0dec08-79bb-4c4e-88c7-0b5eb0931a65" />
<img width="1362" height="646" alt="AISOC 2" src="https://github.com/user-attachments/assets/9953fa19-918c-4605-9a1d-bf2b81388199" />
<img width="1365" height="641" alt="AISOC 3" src="https://github.com/user-attachments/assets/68a4b466-6371-41b4-8e5a-9b14aa7a58ca" />
<img width="1362" height="633" alt="AISOC 4" src="https://github.com/user-attachments/assets/0b9b13c7-b9c2-4d8a-a962-8d80fe5bc282" />

