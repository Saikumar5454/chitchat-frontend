import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the login screen', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^log in$/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /create an account/i })).toBeInTheDocument();
});
