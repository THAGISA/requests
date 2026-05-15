````md
# Project README

## Overview

This project is a modern web application built using React and TypeScript with a Vite development environment. It uses shadcn-ui and Tailwind CSS for UI components and styling.

The development approach follows a modular structure to ensure scalability, maintainability, and clean separation of concerns.

---

# Technology Stack

The project uses the following technologies:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Zustand (for complex state management where required)
- Supabase (backend integration where applicable)

---

# Project Structure

The application follows a modular page-based architecture.

Example structure:

```text
src/
├── api/                  # API services and data types
├── pages/
│   ├── Dashboard/
│   │   ├── Index.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   └── stores/
│   │
│   ├── Users/
│   │   ├── Index.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   └── stores/
│
├── components/           # Shared global components
├── hooks/                # Shared hooks
├── stores/               # Shared application stores
├── lib/                  # Utility functions
├── App.tsx               # Route definitions
├── index.css             # Global styling
└── main.tsx
```

---

# Development Workflow

## Step 1: Configure Theme and Styling

Adjust application theme and visual styling according to requirements:

Files:

```text
src/index.css
tailwind.config.ts
```

Tasks:

- Configure colors
- Typography
- Layout spacing
- Global styles
- Brand themes

---

## Step 2: Identify Required Pages

Review user requirements and determine necessary pages.

Examples:

- Dashboard
- User Management
- Reports
- Settings
- Authentication
- Profile
- Analytics

---

## Step 3: Create Page Structure

Under the `pages` directory, create a folder for each page with an entry file:

Example:

```text
pages/
└── Dashboard/
    └── Index.tsx
```

---

## Step 4: Configure Routing

Register newly created pages in:

```tsx
App.tsx
```

Example:

```tsx
import Dashboard from './pages/Dashboard/Index';
import Users from './pages/Users/Index';

<Routes>
   <Route path="/" element={<Dashboard />} />
   <Route path="/users" element={<Users />} />
</Routes>
```

---

## Step 5: Implement Page Logic

### For simple pages

Keep implementation within:

```tsx
Index.tsx
```

Example:

```tsx
const Dashboard = () => {
    return (
        <div>
            Dashboard
        </div>
    );
};

export default Dashboard;
```

---

### For complex pages

Split functionality into components.

Recommended structure:

```text
Dashboard/
├── Index.tsx
├── components/
├── hooks/
└── stores/
```

Definitions:

| Folder | Purpose |
|----------|----------|
| components | Reusable page-specific components |
| hooks | Custom hooks |
| stores | Zustand state management |
| Index.tsx | Page entry |

---

# State Management

For complex interaction and communication between components, use Zustand.

Example:

```tsx
import { create } from 'zustand'

const useStore = create((set) => ({
    count: 0,
    increment: () =>
        set((state) => ({
            count: state.count + 1
        }))
}))
```

---

# Backend API Integration

## Creating New APIs

When adding new APIs:

1. Create a file in:

```text
src/api/
```

Example:

```text
src/api/userApi.ts
```

2. Export associated TypeScript types.

Example:

```tsx
export interface User {
    id: string;
    name: string;
    email: string;
}
```

3. Use `src/demo.ts` as a reference implementation.

---

## Supabase Integration

When integrating with Supabase:

### Rules

- Create API wrappers under `src/api`
- Define explicit data types
- Follow existing schemas
- Avoid direct database logic in UI components

Example:

```tsx
import { supabase } from '@/lib/supabase';

export const getUsers = async () => {
    const { data, error } = await supabase
        .from('users')
        .select('*');

    if (error) throw error;

    return data;
};
```

---

# Type Safety Guidelines

Strict type consistency is required.

Rules:

- Follow predefined interfaces
- Avoid unnecessary type changes
- Minimize schema modifications
- If modifying types:

Checklist:

- Search all references
- Update dependent files
- Verify imports
- Validate compile output

---

# Dependency Installation

Install project dependencies:

```bash
pnpm install
```

or

```bash
pnpm i
```

---

# Validation and Quality Checks

Run linting:

```bash
npm run lint
```

Run TypeScript validation:

```bash
npx tsc --noEmit -p tsconfig.app.json --strict
```

Requirements:

- Zero lint errors
- Zero TypeScript errors
- Strict mode compliance

---

# Best Practices

### Component Design

- Keep components small and reusable
- Separate business logic from presentation
- Use hooks for reusable logic

### API Design

- Centralize API calls
- Export data types
- Maintain consistent response structures

### State Management

- Use local state for simple pages
- Use Zustand only when complexity requires it

### Code Quality

- Maintain strict typing
- Avoid duplicated code
- Use meaningful naming conventions
- Keep files organized

---

# Build and Run

Development:

```bash
npm run dev
```

Production build:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

---

# Maintenance Notes

Before merging code:

- Verify routing works
- Verify API responses
- Run lint checks
- Run TypeScript checks
- Test all page functionality
- Review all modified data types

---

# Goal

The goal of this architecture is to create:

- Scalable applications
- Maintainable code
- Strong type safety
- Modular page structures
- Clean separation of concerns
- Reliable backend integration
````

# requests
