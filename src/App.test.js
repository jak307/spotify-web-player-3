import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App'; // Adjust the path as necessary

test('renders login button', () => {
  render(<App />);
  const linkElement = screen.getByText(/login with spotify/i);
  expect(linkElement).toBeInTheDocument();
});
