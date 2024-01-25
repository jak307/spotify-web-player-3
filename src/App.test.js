test('renders login button', () => {
  render(<App />);
  const linkElement = screen.getByText(/login with spotify/i);
  expect(linkElement).toBeInTheDocument();
});

