
# UpvoteZone - Reddit Upvote Service

UpvoteZone is a service for purchasing Reddit upvotes for your posts. This frontend application provides an intuitive interface for placing one-time and recurring upvote orders, managing your account, and tracking your order history.

## Demo

![UpvoteZone Screenshot](https://i.imgur.com/2jGFkNe.png)

## Features

- **User Dashboard**: View account overview, activity charts, and stats
- **New Orders**: Place one-time upvote orders for Reddit posts
- **Order History**: Track past and current orders with filtering and sorting
- **Payment History**: View all transactions and download receipts
- **Top Up Account**: Add credits to your account using various payment methods

## Technology Stack

- **Framework**: React.js (with TypeScript)
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **Routing**: React Router v6
- **UI Components**: shadcn/ui
- **Backend Integration**: Full API integration with FastAPI backend
- **Charts**: Recharts for data visualization
- **Authentication**: JWT-based authentication
- **Testing**: Jest and React Testing Library

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)

### Installation

1. Clone the repository:
```sh
git clone <repository-url>
cd upvotezone
```

2. Install dependencies:
```sh
npm install
```

3. Start the development server:
```sh
npm run dev
```

4. Open your browser and navigate to [http://localhost:8080](http://localhost:8080)

## Project Structure

```
upvotezone/
├── public/             # Static assets
├── src/
│   ├── components/     # Reusable UI components
│   │   ├── layout/     # Layout components (Sidebar, Header)
│   │   └── ui/         # UI components from shadcn
│   ├── context/        # React context providers
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility functions
│   ├── mocks/          # Mock data for development
│   ├── pages/          # Page components
│   ├── services/       # API service layer
│   └── __tests__/      # Test files
├── tailwind.config.ts  # Tailwind CSS configuration
└── package.json        # Project dependencies
```

## Available Routes

- `/` - Dashboard (User Panel)
- `/order/new` - New Order form
- `/orders/history` - Order History table
- `/payments/history` - Payment History table
- `/account/topup` - Top Up Account form

## Testing

Run the test suite:

```sh
npm test
```

## Build for Production

Create a production build:

```sh
npm run build
```

The build files will be in the `dist` directory.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [shadcn/ui](https://ui.shadcn.com/) for the UI components
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Recharts](https://recharts.org/) for data visualization
