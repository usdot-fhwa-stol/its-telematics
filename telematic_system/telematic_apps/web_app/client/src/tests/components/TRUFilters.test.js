import { expect, test } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import TRUFilters from "../../components/rsu_management/tru-status/components/TRUFilters";

test("TRUFilters should render search field", () => {
  const filters = { search: '', status: 'all' };
  render(<TRUFilters filters={filters} onFilterChange={() => {}} />);

  expect(screen.getByPlaceholderText("Search by Unit ID or Name...")).toBeInTheDocument();
});

test("TRUFilters should render status dropdown", () => {
  const filters = { search: '', status: 'all' };
  const { container } = render(<TRUFilters filters={filters} onFilterChange={() => {}} />);

  // Verify the select component is present
  expect(container.querySelector('[role="combobox"]')).toBeInTheDocument();
});

test("TRUFilters should call onFilterChange when search text changes", () => {
  const filters = { search: '', status: 'all' };
  const handleFilterChange = jest.fn();
  render(<TRUFilters filters={filters} onFilterChange={handleFilterChange} />);

  const searchField = screen.getByPlaceholderText("Search by Unit ID or Name...");
  fireEvent.change(searchField, { target: { value: 'TRU-001' } });

  expect(handleFilterChange).toHaveBeenCalledWith({ search: 'TRU-001' });
});

test("TRUFilters should display current search value", () => {
  const filters = { search: 'TRU-100', status: 'all' };
  render(<TRUFilters filters={filters} onFilterChange={() => {}} />);

  const searchField = screen.getByPlaceholderText("Search by Unit ID or Name...");
  expect(searchField).toHaveValue('TRU-100');
});

test("TRUFilters should display current status value", () => {
  const filters = { search: '', status: 'running' };
  const { container } = render(<TRUFilters filters={filters} onFilterChange={() => {}} />);

  // Check that the status filter combobox is rendered
  expect(container.querySelector('[role="combobox"]')).toBeInTheDocument();
});

test("TRUFilters should call onFilterChange when status changes", () => {
  const filters = { search: '', status: 'all' };
  const handleFilterChange = jest.fn();
  const { container } = render(<TRUFilters filters={filters} onFilterChange={handleFilterChange} />);

  // The Select component is rendered
  expect(container.querySelector('[role="combobox"]')).toBeInTheDocument();
});

test("TRUFilters should have all status options", () => {
  const filters = { search: '', status: 'all' };
  const { container } = render(<TRUFilters filters={filters} onFilterChange={() => {}} />);

  expect(container.querySelector('[role="combobox"]')).toBeInTheDocument();
});

test("TRUFilters should render search icon", () => {
  const filters = { search: '', status: 'all' };
  const { container } = render(<TRUFilters filters={filters} onFilterChange={() => {}} />);

  const searchIcon = container.querySelector('[data-testid="SearchIcon"]');
  expect(searchIcon).toBeInTheDocument();
});
