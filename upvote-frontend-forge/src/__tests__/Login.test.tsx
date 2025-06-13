import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import LoginPage from '@/pages/Login'; // Adjust if path is different
import { api } from '@/services/api';
import { Toaster } from "@/components/ui/toaster"; // To display toasts

// Mock the API service
jest.mock('@/services/api', () => ({
  api: {
    user: {
      loginUser: jest.fn(),
      // signupUser is not used in Login page, but good to have if other tests use this mock structure
      signupUser: jest.fn(),
    },
  },
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// LocationDisplay removed as it's not used for assertions

describe('LoginPage Integration Tests', () => {
  beforeEach(() => {
    // Clear mock call history and implementations before each test
    (api.user.loginUser as jest.Mock).mockClear();
    mockNavigate.mockClear();
    // localStorage.clear(); // Clear local storage if it affects tests
  });

  const renderLoginPage = () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<div>Welcome Home</div>} /> {/* Mock home page */}
          </Routes>
          <Toaster />
        </AuthProvider>
      </MemoryRouter>
    );
  };

  test('successful login navigates to home and calls api correctly', async () => {
    const mockUserData = { id: '1', username: 'testuser', email: 'test@example.com', credits: 100, joined_date: new Date().toISOString() };
    (api.user.loginUser as jest.Mock).mockResolvedValue(mockUserData);

    renderLoginPage();

    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(api.user.loginUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    // Toast assertion (basic check for presence, specific message is harder)
    // This relies on AuthContext calling toast, which it does.
    await waitFor(() => {
        // Using a regex because the exact message might include username
        expect(screen.getByText(/logged in successfully/i)).toBeInTheDocument();
    });
  });

  test('failed login shows error toast and does not navigate', async () => {
    (api.user.loginUser as jest.Mock).mockRejectedValue(new Error('Invalid credentials'));

    renderLoginPage();

    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'wrong@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'wrongpassword' } });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(api.user.loginUser).toHaveBeenCalledWith({
        email: 'wrong@example.com',
        password: 'wrongpassword',
      });
    });

    await waitFor(() => {
      // Using a regex because the exact message might be "Invalid credentials" from the error
      expect(screen.getByText(/login failed/i)).toBeInTheDocument();
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();

    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
