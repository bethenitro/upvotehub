import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import SignupPage from '@/pages/Signup'; // Adjust if path is different
import { api } from '@/services/api';
import { Toaster } from "@/components/ui/toaster";

// Mock the API service
jest.mock('@/services/api', () => ({
  api: {
    user: {
      loginUser: jest.fn(),
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

describe('SignupPage Integration Tests', () => {
  beforeEach(() => {
    (api.user.signupUser as jest.Mock).mockClear();
    mockNavigate.mockClear();
    // localStorage.clear();
  });

  const renderSignupPage = () => {
    render(
      <MemoryRouter initialEntries={['/signup']}>
        <AuthProvider>
          <Routes>
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/" element={<div>Welcome Home - Signup</div>} /> {/* Mock home page */}
          </Routes>
          <Toaster />
        </AuthProvider>
      </MemoryRouter>
    );
  };

  test('successful signup navigates to home and calls api correctly', async () => {
    const mockUserData = { id: '2', username: 'newuser', email: 'new@example.com', credits: 0, joined_date: new Date().toISOString() };
    (api.user.signupUser as jest.Mock).mockResolvedValue(mockUserData);

    renderSignupPage();

    fireEvent.change(screen.getByPlaceholderText('Enter your username'), { target: { value: 'newuser' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getAllByPlaceholderText('Enter your password')[0], { target: { value: 'password123' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm your password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /i agree to the terms and conditions/i }));
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(api.user.signupUser).toHaveBeenCalledWith({
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    await waitFor(() => {
      expect(screen.getByText(/account created/i)).toBeInTheDocument();
      expect(screen.getByText(/welcome to upvotehub!/i)).toBeInTheDocument();
    });
  });

  test('failed signup due to password mismatch shows error', async () => {
    renderSignupPage();

    fireEvent.change(screen.getByPlaceholderText('Enter your username'), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getAllByPlaceholderText('Enter your password')[0], { target: { value: 'password123' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm your password'), { target: { value: 'password456' } }); // Mismatch
    fireEvent.click(screen.getByRole('checkbox', { name: /i agree to the terms and conditions/i }));

    // Click create account button
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
        // Check for the specific error message related to password mismatch from the component's validation
        // This message comes from the form's validation logic within the SignupPage component itself.
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });

    expect(api.user.signupUser).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('failed signup due to backend error shows error toast and does not navigate', async () => {
    (api.user.signupUser as jest.Mock).mockRejectedValue(new Error('Email already exists'));

    renderSignupPage();

    fireEvent.change(screen.getByPlaceholderText('Enter your username'), { target: { value: 'existinguser' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'exists@example.com' } });
    fireEvent.change(screen.getAllByPlaceholderText('Enter your password')[0], { target: { value: 'password123' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm your password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /i agree to the terms and conditions/i }));
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(api.user.signupUser).toHaveBeenCalledWith({
        username: 'existinguser',
        email: 'exists@example.com',
        password: 'password123',
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/signup failed/i)).toBeInTheDocument();
      expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
