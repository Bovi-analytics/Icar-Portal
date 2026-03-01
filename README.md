# ICAR 305-Day Milk Yield Validation Portal

A comprehensive web platform for validating and benchmarking cumulative 305-day milk yield calculations across dairy organizations worldwide. This platform enables organizations to compare their calculation methods against ICAR reference standards and contribute to global dairy cattle data standardization efforts.

## 🌟 Overview

The ICAR 305-Day Milk Yield Validation Portal is a collaborative research platform developed by the Cornell Bovi-Analytics Lab in partnership with ICAR. It serves as a central hub for:

- **Validating** cumulative 305-day milk yield calculations
- **Comparing** results across organizations to identify variability
- **Supporting** global standardization and improving genetic evaluation systems
- **Contributing** to research while maintaining data anonymity

## ✨ Key Features

### For Users
- 🔐 **Secure Authentication** - Auth0-based authentication with role-based access control
- 📊 **Dataset Generation** - Generate personalized test datasets for validation
- 📤 **Result Submission** - Upload calculated results via Excel files with validation
- 📈 **Comparison Reports** - Download detailed PDF reports comparing your results against ICAR standards
- 📋 **Dashboard** - View all your submissions and track validation progress
- 👤 **Profile Management** - Manage organization information and profile details
- 🔍 **Admin Panel** - Administrative access for managing all submissions (admin role required)

### Technical Features
- **Real-time Validation** - Excel file validation with column checking and data integrity verification
- **Statistical Analysis** - Comprehensive metrics including Pearson correlation, RMSE, MAE, and MAPE
- **Parity-based Analysis** - Separate analysis for different parity groups (1, 2, 3+)
- **Visual Reports** - PDF reports with scatter plots and statistical comparisons
- **Azure Blob Storage** - Scalable cloud storage for datasets and generated files
- **Responsive Design** - Modern, mobile-friendly user interface

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 19.1.0
- **Routing**: React Router DOM 7.7.0
- **Authentication**: Auth0 React SDK 2.6.0
- **Styling**: 
  - Custom CSS with modern design patterns
  - Tailwind CSS 4.1.11
  - Framer Motion 12.23.6 (animations)
- **Icons**: React Icons 5.5.0, Lucide React 0.525.0
- **File Processing**: XLSX 0.18.5 (Excel file handling)
- **Build Tool**: Create React App (react-scripts 5.0.1)

### Backend (API)
- **Framework**: Flask 3.1.2
- **Authentication**: Authlib 1.6.5 (JWT Bearer Token validation with Auth0)
- **Data Processing**: 
  - Pandas 2.3.3 (data manipulation)
  - NumPy 2.3.5 (numerical computations)
  - SciPy 1.16.3 (scientific computing)
  - Scikit-learn 1.7.2 (machine learning metrics)
- **File Generation**: 
  - FPDF 1.7.2 (PDF generation)
  - Matplotlib 3.10.7 (data visualization)
  - OpenPyXL 3.1.5 (Excel file handling)
- **Cloud Storage**: Azure Storage Blob SDK 12.27.1
- **CORS**: Flask-CORS 6.0.1
- **Server**: Gunicorn (production)

### Data Storage
- **Primary Storage**: Azure Blob Storage (JSON-based object storage)
- **File Storage**: Azure Blob Storage for datasets and generated files
- **Models**: Custom ORM with ParentModel base class

## 📁 Project Structure

```
Icar-Portal/
├── api/                          # Backend API
│   ├── v1/
│   │   ├── app.py               # Flask application entry point
│   │   └── views/               # API route handlers
│   │       ├── generate.py     # Dataset generation endpoints
│   │       ├── submission.py   # Submission and comparison endpoints
│   │       ├── user.py         # User profile endpoints
│   │       ├── validator.py    # Auth0 JWT validator
│   │       └── index.py        # Status endpoints
│   └── requirements.txt         # Python dependencies
├── frontend/                     # React frontend application
│   ├── public/                  # Static assets
│   ├── src/
│   │   ├── pages/              # React page components
│   │   │   ├── Landing.jsx    # Landing page
│   │   │   ├── Generate.jsx    # Dataset generation page
│   │   │   ├── Submit.jsx     # Result submission page
│   │   │   ├── Dashboard.jsx  # User dashboard
│   │   │   ├── Profile.jsx    # User profile page
│   │   │   └── Admin.jsx      # Admin panel
│   │   ├── styles/             # CSS stylesheets
│   │   ├── App.js              # Main app component with routing
│   │   └── index.js            # React entry point
│   └── package.json            # Node.js dependencies
├── models/                       # Data models
│   ├── user.py                  # User model
│   ├── generate.py              # Generate (dataset) model
│   ├── submission.py            # Submission model
│   └── engine/
│       └── blob_storage.py     # Azure Blob Storage engine
├── data/                         # Local data storage (development)
│   └── generated/               # Generated Excel files
├── requirements.txt             # Root Python dependencies
└── README.md                    # This file
```

## 🎨 Frontend Description

### Architecture
The frontend is a single-page application (SPA) built with React, providing a modern, responsive user experience with smooth navigation and animations.

### Key Components

#### **Landing Page** (`/`)
- Hero section with animated background
- Platform overview and mission statement
- Step-by-step process explanation
- Call-to-action sections
- Professional footer with contact information

#### **Generate Page** (`/generate`)
- One-click dataset generation
- Downloads personalized Excel dataset containing:
  - TestId, TestDate, CalvingDate, BirthDate
  - Parity, DaysInMilk, DailyMilkingYield
- Displays TestSet ID for tracking
- Secure download link generation

#### **Submit Page** (`/submit`)
- Excel file upload with real-time validation
- Column validation (requires TestObjectID and CalculatedMilkYield columns)
- Data preview table (first 5 rows)
- Form fields for:
  - Organization name
  - Country (dropdown with all countries)
  - Calculation method (TIM, ISLC, BP, MTP, or Other)
  - Notes
  - TestSet ID
- Template download option
- Error handling and validation feedback

#### **Dashboard Page** (`/dashboard`)
- Grid view of all user submissions
- Submission cards showing:
  - TestSet ID
  - Organization, name, method, country
  - Submission date
  - Notes
- Actions:
  - Download original test data
  - View comparison report (PDF download)
  - Delete submission (with confirmation)
- Loading states and empty state handling

#### **Profile Page** (`/profile`)
- Display user information (name, email)
- Organization management (view/edit)
- Profile picture display (from Auth0)
- Edit mode with save functionality

#### **Admin Page** (`/admin`)
- Admin-only access (role-based)
- View all submissions across all users
- Same functionality as dashboard but with global access

### Design Features
- **Modern UI**: Clean, professional design with gradient backgrounds
- **Color Scheme**: Primary blue (#0084ca) with orange accents (#f15a22)
- **Animations**: Smooth page transitions using Framer Motion
- **Responsive**: Mobile-first design that works on all screen sizes
- **Accessibility**: Semantic HTML and ARIA labels
- **User Experience**: Intuitive navigation with clear visual feedback

### Authentication Flow
- Auth0 integration for secure authentication
- JWT token-based API communication
- Role-based access control (admin vs regular users)
- Automatic token refresh
- Protected routes with authentication checks

## 🔌 Backend/API Description

### Architecture
The backend is a RESTful API built with Flask, following a modular structure with separate view modules for different functionalities. It uses Azure Blob Storage for data persistence and file storage.

### Core Models

#### **User Model**
- Attributes: `email`, `name`, `organization`
- Relationships: One-to-many with Generate objects
- Methods: Profile retrieval and updates

#### **Generate Model**
- Attributes: 
  - `user_id`, `download_url`, `test_set_id`
  - `test_obj_ids[]`, `calculated_milk_yields[]`, `parity[]`
- Relationships: Belongs to User, has many Submissions
- Purpose: Represents a generated test dataset

#### **Submission Model**
- Attributes:
  - `generate_id`, `calculation_method`, `organization`, `country`
  - `notes`, `download_url`
  - `test_obj_ids[]`, `calculated_milk_yields[]`
- Relationships: Belongs to Generate
- Purpose: Represents a user's submitted calculation results

### API Endpoints

#### **Authentication**
All protected endpoints require JWT Bearer token in Authorization header.

#### **Status Endpoints**
- `GET /api/v1/status` - API health check
- `GET /api/v1/` - Welcome message

#### **User Endpoints**
- `GET /api/v1/profile?email={email}` - Get user profile
- `POST /api/v1/profile-update` - Update user organization

#### **Dataset Generation**
- `GET /api/v1/generate?email={email}&name={name}` - Generate test dataset
  - Returns: `test_set_id`, `download_link`
  - Process:
    1. Loads master dataset from Azure Blob Storage
    2. Randomly samples 300 test IDs
    3. Calculates reference yields using Test Interval Method (TIM)
    4. Generates Excel file
    5. Uploads to Azure Blob Storage
    6. Creates Generate object with metadata

#### **Submission Endpoints**
- `POST /api/v1/submit?email={email}` - Submit calculation results
  - Body: FormData with file, organization, country, method, notes, test_set_id
  - Validates Excel file structure
  - Extracts milk yield data
  - Creates Submission object
  - Returns submission ID

- `GET /api/v1/submissions?email={email}&admin={yes|no}` - Get submissions
  - Returns list of user's submissions or all submissions (if admin)
  - Includes metadata: dates, methods, organizations, countries

- `DELETE /api/v1/submission/{submission_id}` - Delete submission
  - Removes submission from storage

#### **Comparison Endpoints**
- `GET /api/v1/compare/{submission_id}?download=true` - Generate comparison report
  - Calculates metrics:
    - Pearson correlation coefficient
    - Root Mean Squared Error (RMSE)
    - Mean Absolute Error (MAE)
    - Mean Absolute Percentage Error (MAPE)
  - Generates PDF report with:
    - Overall performance metrics
    - Parity-specific analysis (Parity 1, 2, 3+)
    - Scatter plots (Reference vs Submitted, Actual vs Submitted)
    - Statistical tables
    - Organization and method details

#### **File Download**
- `GET /api/v1/download/{filename}` - Download generated Excel files

### Key Algorithms

#### **Test Interval Method (TIM)**
The platform uses the Test Interval Method to calculate reference 305-day milk yields:
- Trapezoidal rule for interim days between test intervals
- Linear projection for days before first test and after last test
- Filters out records with DaysInMilk > 305
- Handles edge cases for lactations with insufficient data points

### Data Processing Pipeline

1. **Dataset Generation**:
   - Load master dataset from Azure Blob
   - Random sampling of 300 test IDs
   - Calculate reference yields using TIM
   - Generate Excel file
   - Store in Azure Blob Storage

2. **Submission Processing**:
   - Validate Excel file structure
   - Extract TestObjectID and CalculatedMilkYield columns
   - Validate data types and ranges
   - Check for duplicates
   - Store submission with metadata

3. **Comparison Analysis**:
   - Load reference yields from Generate object
   - Load actual yields from Azure Blob (ActualMilkYields.csv)
   - Calculate statistical metrics
   - Generate visualizations (scatter plots)
   - Create PDF report with all analyses

### Security Features
- **JWT Authentication**: All endpoints protected with Auth0 JWT validation
- **CORS Configuration**: Configured for frontend domain
- **Input Validation**: Excel file validation, data type checking
- **Error Handling**: Comprehensive try-catch blocks with meaningful error messages
- **Role-Based Access**: Admin endpoints check for admin role

### Storage Architecture
- **Primary Storage**: Azure Blob Storage (JSON-based)
  - All models stored as JSON in a single blob
  - In-memory cache for fast access
  - Automatic persistence on save operations
- **File Storage**: Azure Blob Storage
  - Generated Excel datasets
  - Master datasets (TestDataSet.csv, ActualMilkYields.csv)

## 🚀 Setup Instructions

### Prerequisites
- Python 3.12+
- Node.js 16+ and npm
- Azure Storage Account with Blob Storage
- Auth0 account and application

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Icar-Portal
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   Create a `.env` file in the root directory:
   ```env
   AUTH0_DOMAIN=your-auth0-domain
   AUTH0_AUDIENCE=your-auth0-audience
   AZURE_STORAGE_CONNECTION_STRING=your-azure-connection-string
   AZURE_CONTAINER_NAME=your-container-name
   AZURE_BLOB_NAME=your-blob-name.json
   BLOB_DATASET_NAME=TestDataSet.csv
   FULL_DATASET_PATH=ActualMilkYields.csv
   PORT=5000
   ```

5. **Upload datasets to Azure Blob Storage**
   - Upload `TestDataSet.csv` to your container
   - Upload `ActualMilkYields.csv` to your container

6. **Run the API server**
   ```bash
   cd api/v1
   python app.py
   # Or for production:
   gunicorn -w 4 -b 0.0.0.0:5000 app:app
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the `frontend` directory:
   ```env
   REACT_APP_AUTH0_DOMAIN=your-auth0-domain
   REACT_APP_AUTH0_CLIENT_ID=your-auth0-client-id
   REACT_APP_AUTH0_AUDIENCE=your-auth0-audience
   REACT_APP_REDIRECT_URI=http://localhost:3000
   REACT_APP_BASE_API_URL=http://localhost:5000
   REACT_APP_AUTH0_SCOPE=openid profile email
   ```

4. **Start development server**
   ```bash
   npm start
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## 📊 API Documentation

### Request/Response Examples

#### Generate Dataset
```http
GET /api/v1/generate?email=user@example.com&name=John%20Doe
Authorization: Bearer {jwt_token}
```

Response:
```json
{
  "success": true,
  "test_set_id": "uuid-here",
  "download_link": "/api/v1/download/filename.xlsx"
}
```

#### Submit Results
```http
POST /api/v1/submit?email=user@example.com
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data

file: [Excel file]
organization: "Dairy Farm Inc"
country: "United States"
calculation_method: "TIM"
notes: "Additional notes"
test_set_id: "uuid-here"
```

Response:
```json
{
  "success": true,
  "message": "Submission uploaded successfully",
  "submission_id": "uuid-here"
}
```

## 🌐 Deployment

### Azure Deployment
The project is configured for Azure deployment with GitHub Actions:

- **Frontend**: Azure Static Web Apps
- **Backend**: Azure App Service (Python)

### GitHub Workflows
- `.github/workflows/azure-static-web-apps-*.yml` - Frontend deployment
- `.github/workflows/master_icar-portal.yml` - Backend deployment

### Configuration Files
- `frontend/public/staticwebapp.config.json` - Azure Static Web Apps routing configuration

## 🔒 Security Considerations

- All API endpoints require JWT authentication
- CORS configured for specific origins (update for production)
- Input validation on all user inputs
- File size limits on uploads (10MB max)
- Secure file handling and storage
- Role-based access control for admin features

## 📝 Notes

- The platform uses Azure Blob Storage for all data persistence
- Datasets are loaded from Azure Blob on each request (consider caching for production)
- PDF generation creates temporary files that are cleaned up automatically
- All calculations use the Test Interval Method (TIM) as the reference standard

## 🤝 Contributing

This is a research platform developed by the Cornell Bovi-Analytics Lab. For questions or contributions, please contact:

- **Email**: mbv32@cornell.edu
- **Website**: [bovi-analytics.com](https://bovi-analytics.com)
- **LinkedIn**: [Bovi Analytics](https://www.linkedin.com/company/bovi-analytics/)

## 📄 License

Copyright © 2025 ICAR & Cornell Bovi-Analytics Lab. All rights reserved.

## 🙏 Acknowledgments

- **ICAR** - International Committee for Animal Recording
- **Cornell Bovi-Analytics Lab** - Research and development
- **Auth0** - Authentication services
- **Azure** - Cloud infrastructure and storage

---

**Built with ❤️ for global dairy cattle data standardization**
