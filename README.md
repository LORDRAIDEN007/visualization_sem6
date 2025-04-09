# Data Visualization Platform

A modern web application for data visualization built with React and Vite, featuring chart generation, data analysis, and user authentication via Supabase.

## Features

- **Interactive Charts**: Create and customize various chart types using Chart.js
- **Data Import**: Upload and parse CSV files using PapaParse
- **User Authentication**: Secure login and user management with Supabase
- **Responsive Design**: Works on desktop and mobile devices
- **Customizable Workspace**: Personalize your visualization environment

## Technologies Used

- **Frontend**: React 19, React Router 7
- **Visualization**: Chart.js, react-chartjs-2
- **Backend/Auth**: Supabase
- **Build Tools**: Vite 6
- **Data Parsing**: PapaParse
- **Styling**: CSS with react-color for color pickers

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- Supabase account for backend services

### Installation

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd visualization
   ```

2. Install dependencies
   ```bash
   npm install
   # or
   yarn
   ```

3. Set up environment variables
   - Create a `.env` file in the root directory
   - Add the following variables:
     ```
     VITE_SUPABASE_URL=your_supabase_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     REACT_APP_GROQ_API_KEY=your_groq_api_key (if using Groq AI services)
     ```

### Development

Start the development server:

```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
# or
yarn build
```

Preview the production build:

```bash
npm run preview
# or
yarn preview
```

## Project Structure

```
/
├── public/            # Static assets
├── src/
│   ├── assets/        # Images and other assets
│   ├── components/    # React components
│   │   ├── ChartView/     # Chart visualization components
│   │   ├── Controls/      # UI control components
│   │   ├── Dashboard/     # Dashboard layout components
│   │   ├── LandingPage/   # Landing page components
│   │   ├── TableView/     # Data table components
│   │   ├── Workspace/     # Workspace components
│   │   └── shared/        # Shared/common components
│   ├── contexts/      # React contexts (including AuthContext)
│   ├── App.jsx        # Main application component
│   ├── main.jsx       # Application entry point
│   └── supabase.js    # Supabase client configuration
└── index.html        # HTML entry point
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
