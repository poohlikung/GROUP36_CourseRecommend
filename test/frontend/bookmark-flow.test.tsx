import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../../code/frontend/src/auth/AuthContext';
import { BookmarkButton } from '../../code/frontend/src/features/bookmarks/BookmarkButton';
import { MemoryRouter, render, screen, userEvent, waitFor } from '../../code/frontend/src/test/test-utils';

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('../../code/frontend/src/api/auth', async () => {
  const actual = await vi.importActual<typeof import('../../code/frontend/src/api/auth')>(
    '../../code/frontend/src/api/auth',
  );
  return { ...actual, authApi: { ...actual.authApi, currentUser: mocks.currentUser } };
});

vi.mock('../../code/frontend/src/features/bookmarks/bookmarkApi', () => ({
  bookmarkApi: { save: mocks.save, remove: mocks.remove },
}));

function Harness() {
  const [saved, setSaved] = useState(false);
  return <BookmarkButton courseId={12} courseTitle="Test Course" saved={saved} onChange={setSaved} />;
}

describe('bookmark action', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
  });

  it('saves and removes a course for the signed-in user', async () => {
    mocks.currentUser.mockResolvedValue({ id: 1, email: 'learner@test.local', displayName: 'Learner', role: 'LEARNER' });
    mocks.save.mockResolvedValue(undefined);
    mocks.remove.mockResolvedValue(undefined);
    render(<MemoryRouter><AuthProvider><Harness /></AuthProvider></MemoryRouter>);

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'บันทึก Test Course' }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(12));
    await user.click(await screen.findByRole('button', { name: 'ยกเลิกบันทึก Test Course' }));
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith(12));
  });
});
