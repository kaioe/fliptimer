/**
 * Setup file for vitest tests
 */
import { vi } from "vitest";

// Mock jQuery globally
const mockjQuery = {
	extend: vi.fn(() => ({})),
	each: vi.fn(),
	on: vi.fn(),
	trigger: vi.fn(),
	html: vi.fn(() => ""),
	text: vi.fn(() => ""),
	attr: vi.fn(() => ({})),
	addClass: vi.fn(),
	removeClass: vi.fn(),
	toggleClass: vi.fn(),
	css: vi.fn(),
	find: vi.fn(() => $()),
	children: vi.fn(() => $()),
	parent: vi.fn(() => $()),
	closest: vi.fn(() => $()),
};

vi.stubGlobal("$", () => mockjQuery);

vi.stubGlobal("jQuery", () => mockjQuery);
