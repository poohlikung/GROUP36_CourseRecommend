import '@testing-library/jest-dom/vitest';

export { act, render, screen, waitFor, cleanup, within } from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
export { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
