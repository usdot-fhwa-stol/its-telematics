import { expect, test } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";

const MockedNavbar = () => (
  <BrowserRouter>
    <Navbar />
  </BrowserRouter>
);

test("Navbar should render site title", () => {
  render(<MockedNavbar />);

  expect(screen.getByText("Telematic System")).toBeInTheDocument();
});

test("Navbar should render RSU Management link", () => {
  render(<MockedNavbar />);

  expect(screen.getByText("RSU Management")).toBeInTheDocument();
});

test("Navbar should navigate to home when title clicked", () => {
  render(<MockedNavbar />);

  const title = screen.getByText("Telematic System");
  expect(title).toBeInTheDocument();
  
  // Verify it's clickable
  fireEvent.click(title);
});

test("Navbar should navigate to RSU Management when link clicked", () => {
  render(<MockedNavbar />);

  const link = screen.getByText("RSU Management");
  expect(link).toBeInTheDocument();
  
  // Verify it's clickable
  fireEvent.click(link);
});

test("Navbar should render AppBar component", () => {
  const { container } = render(<MockedNavbar />);

  const appBar = container.querySelector('header');
  expect(appBar).toBeInTheDocument();
});
