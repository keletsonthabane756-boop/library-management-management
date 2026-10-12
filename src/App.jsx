
import { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  NavLink,
  useNavigate,
} from 'react-router-dom';
import './App.css';

const makeId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function readStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

const defaultAdmin = {
  id: 'default-admin',
  name: 'Library Administrator',
  membershipId: 'ADMIN001',
  role: 'Admin',
};

function App() {
  const [books, setBooks] = useState(() =>
    readStorage('libraryBooks', []).map((book) => ({
      ...book,
      id: book.id ?? makeId(),
      quantity: Math.max(0, Number(book.quantity) || 0),
    }))
  );

  const [transactions, setTransactions] = useState(() =>
    readStorage('libraryTransactions', [])
  );

  const [users, setUsers] = useState(() => {
    const saved = readStorage('libraryUsers', null);
    return Array.isArray(saved) && saved.length
      ? saved
      : [defaultAdmin];
  });

  const [currentUser, setCurrentUser] = useState(() =>
    readStorage('loggedInUser', null)
  );

  useEffect(() => {
    localStorage.setItem('libraryBooks', JSON.stringify(books));
  }, [books]);

  useEffect(() => {
    localStorage.setItem(
      'libraryTransactions',
      JSON.stringify(transactions)
    );
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('libraryUsers', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('loggedInUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('loggedInUser');
    }
  }, [currentUser]);

  function login(membershipId) {
    const user = users.find(
      (item) =>
        item.membershipId.toLowerCase() ===
        membershipId.trim().toLowerCase()
    );

    if (!user) {
      return false;
    }

    setCurrentUser(user);
    return true;
  }

  function logout() {
    setCurrentUser(null);
  }

  function addBook(book) {
    setBooks((previous) => [...previous, book]);
  }

  function updateBook(updatedBook) {
    setBooks((previous) =>
      previous.map((book) =>
        book.id === updatedBook.id ? updatedBook : book
      )
    );
  }

  function deleteBook(id) {
    setBooks((previous) => previous.filter((book) => book.id !== id));
  }

  function recordTransaction(details) {
    const quantity = Number(details.quantity);

    if (!Number.isInteger(quantity) || quantity < 1) {
      return { ok: false, message: 'Enter a positive whole quantity.' };
    }

    const book = books.find((item) => item.id === details.bookId);

    if (!book) {
      return { ok: false, message: 'Please select a valid book.' };
    }

    if (
      details.type === 'Borrow' &&
      quantity > Number(book.quantity)
    ) {
      return {
        ok: false,
        message: 'There are not enough copies available.',
      };
    }

    if (details.type === 'Return') {
      const borrowed = transactions.reduce((total, item) => {
        if (
          item.bookId !== book.id ||
          item.memberName.toLowerCase() !==
            details.memberName.trim().toLowerCase()
        ) {
          return total;
        }

        if (item.type === 'Borrow') return total + Number(item.quantity);
        if (item.type === 'Return') return total - Number(item.quantity);
        return total;
      }, 0);

      if (quantity > borrowed) {
        return {
          ok: false,
          message: 'This member has not borrowed that many copies.',
        };
      }
    }

    const newQuantity =
      details.type === 'Borrow'
        ? Number(book.quantity) - quantity
        : Number(book.quantity) + quantity;

    setBooks((previous) =>
      previous.map((item) =>
        item.id === book.id
          ? { ...item, quantity: newQuantity }
          : item
      )
    );

    setTransactions((previous) => [
      {
        id: makeId(),
        bookId: book.id,
        bookTitle: book.title,
        type: details.type,
        quantity,
        memberName: details.memberName.trim(),
        date: new Date().toLocaleString(),
      },
      ...previous,
    ]);

    return { ok: true, message: 'Transaction recorded successfully.' };
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            currentUser ? (
              <Navigate to="/" replace />
            ) : (
              <LoginPage onLogin={login} />
            )
          }
        />

        <Route
          path="/"
          element={
            currentUser ? (
              <Layout user={currentUser} onLogout={logout}>
                <Dashboard books={books} transactions={transactions} />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/books"
          element={
            currentUser ? (
              <Layout user={currentUser} onLogout={logout}>
                <BooksPage
                  books={books}
                  onAdd={addBook}
                  onUpdate={updateBook}
                  onDelete={deleteBook}
                />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/transactions"
          element={
            currentUser ? (
              <Layout user={currentUser} onLogout={logout}>
                <TransactionsPage
                  books={books}
                  transactions={transactions}
                  onRecord={recordTransaction}
                />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/users"
          element={
            currentUser?.role === 'Admin' ? (
              <Layout user={currentUser} onLogout={logout}>
                <UsersPage
                  users={users}
                  currentUser={currentUser}
                  setUsers={setUsers}
                />
              </Layout>
            ) : currentUser ? (
              <Navigate to="/" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="*"
          element={<Navigate to={currentUser ? '/' : '/login'} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

function Layout({ user, onLogout, children }) {
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">✿</span>
          <div>
            <h1>BookBloom</h1>
            <p>Community Library</p>
          </div>
        </div>

        <p className="nav-label">MAIN MENU</p>

        <nav className="navigation">
          <NavLink to="/" end>
            <span>▦</span> Dashboard
          </NavLink>
          <NavLink to="/books">
            <span>▤</span> Book Management
          </NavLink>
          <NavLink to="/transactions">
            <span>⇄</span> Transactions
          </NavLink>
          {user.role === 'Admin' && (
            <NavLink to="/users">
              <span>♙</span> User Management
            </NavLink>
          )}
        </nav>

        <div className="sidebar-bottom">
          <div className="profile">
            <div className="avatar">{user.name.charAt(0).toUpperCase()}</div>
            <div className="profile-text">
              <strong>{user.name}</strong>
              <span>{user.role}</span>
            </div>
          </div>
          <button
            className="logout-button"
            onClick={() => {
              onLogout();
              navigate('/login');
            }}
          >
            ↪ Log out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="eyebrow">YOUR LITTLE CORNER OF KNOWLEDGE</span>
            <h2>Welcome to BookBloom 🌷</h2>
          </div>
          <div className="topbar-user">{user.name}</div>
        </header>

        <div className="page-content">{children}</div>
        <footer className="footer">
          BookBloom Community Library · Growing minds, one book at a time.
        </footer>
      </main>
    </div>
  );
}

function LoginPage({ onLogin }) {
  const [membershipId, setMembershipId] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!membershipId.trim()) {
      setError('Please enter your membership ID.');
      return;
    }
    if (!onLogin(membershipId)) {
      setError('Membership ID not found. Ask an administrator to add you.');
      return;
    }
    setError('');
  }

  return (
    <div className="login-screen">
      <div className="login-art">
        <span className="login-flower">✿</span>
        <p className="eyebrow">A COMMUNITY THAT GROWS TOGETHER</p>
        <h1>Every book opens a new world.</h1>
        <p>Welcome to a little place where stories, knowledge and people meet.</p>
      </div>

      <div className="login-panel">
        <form className="login-card" onSubmit={handleSubmit}>
          <div className="login-logo">✿</div>
          <p className="eyebrow">WELCOME TO BOOKBLOOM</p>
          <h2>Let's get you in.</h2>
          <p className="muted">
            Sign in with your library membership ID.
          </p>

          <label>
            Membership ID
            <input
              value={membershipId}
              onChange={(e) => setMembershipId(e.target.value)}
              placeholder="e.g. ADMIN001"
              autoComplete="username"
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="primary-button full-width" type="submit">
            Sign in <span>→</span>
          </button>
          <p className="login-hint">
            First setup? Use the default administrator ID: <strong>ADMIN001</strong>
          </p>
        </form>
      </div>
    </div>
  );
}

function Dashboard({ books, transactions }) {
  const totalCopies = books.reduce(
    (total, book) => total + Number(book.quantity || 0),
    0
  );
  const lowStock = books.filter((book) => Number(book.quantity) < 2);

  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR LIBRARY AT A GLANCE</p>
          <h2>Dashboard</h2>
          <p className="muted">Here's what's happening in your library today.</p>
        </div>
        <span className="date-pill">
          {new Date().toLocaleDateString()}
        </span>
      </div>

      <div className="stats-grid">
        <StatCard icon="▤" label="Book Titles" value={books.length} tone="lilac" />
        <StatCard icon="▥" label="Available Copies" value={totalCopies} tone="pink" />
        <StatCard icon="!" label="Low Stock Books" value={lowStock.length} tone="peach" />
        <StatCard icon="⇄" label="Transactions" value={transactions.length} tone="blue" />
      </div>

      <div className="content-grid">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h3>Low Stock Alert</h3>
              <p className="muted">Books with fewer than 2 copies available.</p>
            </div>
            <span className="count-pill">{lowStock.length}</span>
          </div>

          {lowStock.length === 0 ? (
            <div className="empty-state">
              <span>🌸</span>
              <strong>Everything looks good!</strong>
              <p>No books are currently low on stock.</p>
            </div>
          ) : (
            <div className="simple-list">
              {lowStock.map((book) => (
                <div className="simple-list-row" key={book.id}>
                  <div className="mini-book">▤</div>
                  <div className="grow">
                    <strong>{book.title}</strong>
                    <span>{book.author}</span>
                  </div>
                  <span className="stock-badge low">
                    {book.quantity} left
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <h3>Recent Transactions</h3>
              <p className="muted">The latest library activity.</p>
            </div>
          </div>
          {transactions.length === 0 ? (
            <div className="empty-state">
              <span>📚</span>
              <strong>No activity yet</strong>
              <p>Transactions will appear here once recorded.</p>
            </div>
          ) : (
            <div className="simple-list">
              {transactions.slice(0, 5).map((item) => (
                <div className="simple-list-row" key={item.id}>
                  <div className="mini-book">⇄</div>
                  <div className="grow">
                    <strong>{item.bookTitle}</strong>
                    <span>{item.memberName} · {item.date}</span>
                  </div>
                  <span className={`stock-badge ${item.type === 'Borrow' ? 'low' : 'good'}`}>
                    {item.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function StatCard({ icon, label, value, tone }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function BooksPage({ books, onAdd, onUpdate, onDelete }) {
  const emptyForm = {
    title: '',
    author: '',
    genre: '',
    isbn: '',
    quantity: '1',
  };

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const visibleBooks = books.filter((book) =>
    [book.title, book.author, book.genre, book.isbn]
      .some((value) => String(value || '').toLowerCase().includes(search.toLowerCase()))
  );

  function handleChange(e) {
    setForm((previous) => ({
      ...previous,
      [e.target.name]: e.target.value,
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();

    const quantity = Number(form.quantity);

    if (!form.title.trim() || !form.author.trim() || !form.genre.trim() || !form.isbn.trim()) {
      setError('Please complete all book fields.');
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 0) {
      setError('Quantity must be a whole number of zero or more.');
      return;
    }

    const duplicate = books.some(
      (book) =>
        book.isbn.trim().toLowerCase() === form.isbn.trim().toLowerCase() &&
        book.id !== editingId
    );

    if (duplicate) {
      setError('A book with this ISBN already exists.');
      return;
    }

    const savedBook = {
      ...form,
      id: editingId || makeId(),
      title: form.title.trim(),
      author: form.author.trim(),
      genre: form.genre.trim(),
      isbn: form.isbn.trim(),
      quantity,
    };

    if (editingId) onUpdate(savedBook);
    else onAdd(savedBook);

    setForm(emptyForm);
    setEditingId(null);
    setError('');
  }

  function startEdit(book) {
    setEditingId(book.id);
    setForm({
      title: book.title,
      author: book.author,
      genre: book.genre,
      isbn: book.isbn,
      quantity: String(book.quantity),
    });
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  }

  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR COLLECTION</p>
          <h2>Book Management</h2>
          <p className="muted">Keep your collection organised and up to date.</p>
        </div>
        <span className="date-pill">{books.length} titles</span>
      </div>

      <div className="panel form-panel">
        <div className="panel-heading">
          <div>
            <h3>{editingId ? 'Edit Book Details' : 'Add a New Book'}</h3>
            <p className="muted">Enter the book information below.</p>
          </div>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Book Title
            <input name="title" value={form.title} onChange={handleChange} placeholder="Enter book title" required />
          </label>
          <label>
            Author
            <input name="author" value={form.author} onChange={handleChange} placeholder="Enter author's name" required />
          </label>
          <label>
            Genre
            <input name="genre" value={form.genre} onChange={handleChange} placeholder="e.g. Fiction" required />
          </label>
          <label>
            ISBN
            <input name="isbn" value={form.isbn} onChange={handleChange} placeholder="Enter ISBN" required />
          </label>
          <label>
            Initial / Available Quantity
            <input name="quantity" type="number" min="0" step="1" value={form.quantity} onChange={handleChange} required />
          </label>
          {error && <p className="form-error full-span">{error}</p>}
          <div className="form-actions full-span">
            <button className="primary-button" type="submit">
              {editingId ? 'Save Changes' : '+ Add Book'}
            </button>
            {editingId && (
              <button className="secondary-button" type="button" onClick={cancelEdit}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="panel">
        <div className="panel-heading table-heading">
          <div>
            <h3>Book Collection</h3>
            <p className="muted">{books.length} book titles in your library.</p>
          </div>
          <input
            className="search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search books..."
            aria-label="Search books"
          />
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Book Details</th>
                <th>Genre</th>
                <th>ISBN</th>
                <th>Copies</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleBooks.length === 0 ? (
                <tr>
                  <td colSpan="6" className="table-empty">
                    {books.length ? 'No matching books found.' : 'No books added yet. Add your first book above.'}
                  </td>
                </tr>
              ) : (
                visibleBooks.map((book) => (
                  <tr key={book.id}>
                    <td>
                      <div className="book-cell">
                        <div className="mini-book">▤</div>
                        <div>
                          <strong>{book.title}</strong>
                          <span>{book.author}</span>
                        </div>
                      </div>
                    </td>
                    <td>{book.genre}</td>
                    <td>{book.isbn}</td>
                    <td><strong>{book.quantity}</strong></td>
                    <td>
                      <span className={`stock-badge ${Number(book.quantity) < 2 ? 'low' : 'good'}`}>
                        {Number(book.quantity) < 2 ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="icon-button edit" onClick={() => startEdit(book)} aria-label={`Edit ${book.title}`} title="Edit">✎</button>
                        <button className="icon-button delete" onClick={() => {
                          if (window.confirm(`Delete "${book.title}"?`)) onDelete(book.id);
                        }} aria-label={`Delete ${book.title}`} title="Delete">×</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function TransactionsPage({ books, transactions, onRecord }) {
  const [form, setForm] = useState({
    type: 'Borrow',
    bookId: '',
    quantity: '1',
    memberName: '',
  });
  const [message, setMessage] = useState(null);

  function handleChange(e) {
    setForm((previous) => ({
      ...previous,
      [e.target.name]: e.target.value,
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();

    if (!form.memberName.trim()) {
      setMessage({ type: 'error', text: 'Please enter the member or staff name.' });
      return;
    }

    const result = onRecord(form);
    setMessage({
      type: result.ok ? 'success' : 'error',
      text: result.message,
    });

    if (result.ok) {
      setForm({
        type: 'Borrow',
        bookId: '',
        quantity: '1',
        memberName: '',
      });
    }
  }

  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">KEEP TRACK OF EVERY COPY</p>
          <h2>Transactions</h2>
          <p className="muted">Record book borrowing, returns and stock additions.</p>
        </div>
        <span className="date-pill">{transactions.length} records</span>
      </div>

      <div className="panel form-panel">
        <div className="panel-heading">
          <div>
            <h3>Record a Transaction</h3>
            <p className="muted">Book quantities will update automatically.</p>
          </div>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Transaction Type
            <select name="type" value={form.type} onChange={handleChange}>
              <option value="Borrow">Borrow a Book</option>
              <option value="Return">Return a Book</option>
              <option value="Stock Added">Add Stock</option>
            </select>
          </label>

          <label>
            Select Book
            <select name="bookId" value={form.bookId} onChange={handleChange} required>
              <option value="">Choose a book</option>
              {books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title} ({book.quantity} available)
                </option>
              ))}
            </select>
          </label>

          <label>
            Quantity
            <input name="quantity" type="number" min="1" step="1" value={form.quantity} onChange={handleChange} required />
          </label>

          <label>
            Member / Staff Name
            <input name="memberName" value={form.memberName} onChange={handleChange} placeholder="Enter full name" required />
          </label>

          {message && (
            <p className={`notice ${message.type} full-span`}>
              {message.text}
            </p>
          )}

          <div className="form-actions full-span">
            <button className="primary-button" type="submit">Record Transaction</button>
          </div>
        </form>
      </div>

      <div className="panel">
        <div className="panel-heading">
          <div>
            <h3>Transaction History</h3>
            <p className="muted">A record of recent library activity.</p>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Book</th>
                <th>Member / Staff</th>
                <th>Transaction</th>
                <th>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr><td colSpan="5" className="table-empty">No transactions recorded yet.</td></tr>
              ) : (
                transactions.map((item) => (
                  <tr key={item.id}>
                    <td>{item.date}</td>
                    <td><strong>{item.bookTitle}</strong></td>
                    <td>{item.memberName}</td>
                    <td>
                      <span className={`stock-badge ${item.type === 'Borrow' ? 'low' : 'good'}`}>
                        {item.type}
                      </span>
                    </td>
                    <td>{item.quantity}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function UsersPage({ users, currentUser, setUsers }) {
  const emptyForm = { name: '', membershipId: '', role: 'Member' };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();

    const name = form.name.trim();
    const membershipId = form.membershipId.trim();

    if (!name || !membershipId) {
      setError('Please complete all fields.');
      return;
    }

    if (
      users.some(
        (user) =>
          user.membershipId.toLowerCase() === membershipId.toLowerCase() &&
          user.id !== editingId
      )
    ) {
      setError('That membership ID is already in use.');
      return;
    }

    if (
      editingId &&
      users.find((user) => user.id === editingId)?.role === 'Admin' &&
      form.role !== 'Admin'
    ) {
      const otherAdmins = users.filter(
        (user) => user.role === 'Admin' && user.id !== editingId
      );
      if (!otherAdmins.length) {
        setError('Keep at least one administrator account.');
        return;
      }
    }

    const updated = {
      id: editingId || makeId(),
      name,
      membershipId,
      role: form.role,
    };

    setUsers((previous) =>
      editingId
        ? previous.map((user) => user.id === editingId ? updated : user)
        : [...previous, updated]
    );

    setForm(emptyForm);
    setEditingId(null);
    setError('');
  }

  function startEdit(user) {
    setEditingId(user.id);
    setForm({
      name: user.name,
      membershipId: user.membershipId,
      role: user.role,
    });
    setError('');
  }

  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR LIBRARY COMMUNITY</p>
          <h2>User Management</h2>
          <p className="muted">Manage member details and account roles.</p>
        </div>
        <span className="date-pill">{users.length} users</span>
      </div>

      <div className="panel form-panel">
        <div className="panel-heading">
          <div>
            <h3>{editingId ? 'Edit User' : 'Add a New User'}</h3>
            <p className="muted">Membership IDs must be unique.</p>
          </div>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Full Name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter full name" required />
          </label>
          <label>
            Membership ID
            <input value={form.membershipId} onChange={(e) => setForm({ ...form, membershipId: e.target.value })} placeholder="e.g. MEM001" required />
          </label>
          <label>
            Role
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="Member">Member</option>
              <option value="Staff">Staff</option>
              <option value="Admin">Admin</option>
            </select>
          </label>

          {error && <p className="form-error full-span">{error}</p>}

          <div className="form-actions full-span">
            <button className="primary-button" type="submit">
              {editingId ? 'Save User Changes' : '+ Add User'}
            </button>
            {editingId && (
              <button type="button" className="secondary-button" onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
                setError('');
              }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="panel">
        <div className="panel-heading">
          <div>
            <h3>Registered Users</h3>
            <p className="muted">All users currently saved in BookBloom.</p>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Name</th><th>Membership ID</th><th>Role</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td><strong>{user.name}</strong></td>
                  <td>{user.membershipId}</td>
                  <td><span className="role-badge">{user.role}</span></td>
                  <td>
                    <div className="action-buttons">
                      <button className="icon-button edit" onClick={() => startEdit(user)} title="Edit user" aria-label={`Edit ${user.name}`}>✎</button>
                      <button
                        className="icon-button delete"
                        title="Delete user"
                        aria-label={`Delete ${user.name}`}
                        disabled={user.id === currentUser.id || user.id === 'default-admin'}
                        onClick={() => {
                          if (user.id === currentUser.id || user.id === 'default-admin') return;
                          if (user.role === 'Admin' && users.filter((item) => item.role === 'Admin').length === 1) {
                            alert('Keep at least one administrator.');
                            return;
                          }
                          if (window.confirm(`Delete user "${user.name}"?`)) {
                            setUsers((previous) => previous.filter((item) => item.id !== user.id));
                          }
                        }}
                      >×</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default App;