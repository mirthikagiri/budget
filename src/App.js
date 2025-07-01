import React, { useState } from 'react';
import './App.css';

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [income, setIncome] = useState('');
  const [incomeSubmitted, setIncomeSubmitted] = useState(false);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categories, setCategories] = useState([]);
  const [showBillInput, setShowBillInput] = useState({}); // { category: true/false }
  const [billInputs, setBillInputs] = useState({}); // { category: { title, amount } }
  const [bills, setBills] = useState({}); // { category: [{ title, amount }]
  const [expenseError, setExpenseError] = useState('');
  const [activeBillCategory, setActiveBillCategory] = useState(null);
  const [billSuccessMsg, setBillSuccessMsg] = useState('');
  const [currentView, setCurrentView] = useState('home');
  const [viewCategory, setViewCategory] = useState(null);
  const [dailyLimit, setDailyLimit] = useState('');
  const [editLimit, setEditLimit] = useState(false);
  const [customLimit, setCustomLimit] = useState('');
  const [showTodaysBills, setShowTodaysBills] = useState(false);
  const [editBillIdx, setEditBillIdx] = useState(null);
  const [editBillInputs, setEditBillInputs] = useState({ title: '', amount: '' });
  const [showDashboard, setShowDashboard] = useState(false);
  const [categoryLimits, setCategoryLimits] = useState({}); // { category: limit }
  const [categoryLimitInput, setCategoryLimitInput] = useState('');
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const getDaysInMonth = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        setLoggedIn(true);
        setIsReturning(res.status === 200); // 200 means existing user, 201 means new user
      } else {
        setError(data.error ? data.error : 'Login failed');
      }
    } catch (err) {
      setError('Server error. Please try again.');
    }
  };

  const handleIncomeSubmit = (e) => {
    e.preventDefault();
    if (income && !isNaN(income)) {
      const days = getDaysInMonth();
      const limit = Math.floor((parseFloat(income) * 0.8) / days);
      setDailyLimit(limit);
      setCustomLimit(limit);
      setEditLimit(true);
    }
  };

  const handleLimitSave = () => {
    setDailyLimit(customLimit);
    setEditLimit(false);
    setIncomeSubmitted(true);
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (
      categoryName &&
      !categories.includes(categoryName) &&
      categoryLimitInput &&
      !isNaN(categoryLimitInput) &&
      parseFloat(categoryLimitInput) > 0 &&
      parseFloat(categoryLimitInput) <= parseFloat(dailyLimit)
    ) {
      setCategories([...categories, categoryName]);
      setCategoryLimits({ ...categoryLimits, [categoryName]: parseFloat(categoryLimitInput) });
      setCategoryName('');
      setCategoryLimitInput('');
      setShowCategoryInput(false);
    }
  };

  const handleShowBillInput = (category) => {
    setCurrentView('addBill');
    setViewCategory(category);
    setBillInputs({ ...billInputs, [category]: { title: '', amount: '' } });
    setExpenseError('');
  };

  const handleBackToHome = () => {
    setCurrentView('home');
    setViewCategory(null);
    setBillSuccessMsg('');
    setExpenseError('');
  };

  const handleBillInputChange = (category, field, value) => {
    setBillInputs({
      ...billInputs,
      [category]: {
        ...billInputs[category],
        [field]: value
      }
    });
  };

  const handleEditBillClick = (category, idx) => {
    const bill = bills[category][idx];
    setEditBillIdx(idx);
    setEditBillInputs({ title: bill.title, amount: bill.amount });
  };

  const handleEditBillInputChange = (field, value) => {
    setEditBillInputs(prev => ({ ...prev, [field]: value }));
  };

  const handleEditBillCancel = () => {
    setEditBillIdx(null);
    setEditBillInputs({ title: '', amount: '' });
  };

  // Helper to get bill id by index for a category
  const getBillIdByIndex = (category, idx) => {
    // Find the bill in bills[category] and match with backend data
    // This assumes bills[category][idx] is in the same order as backend fetch
    // If not, you may want to store the _id from backend in each bill object
    return bills[category][idx]?._id;
  };

  const handleEditBillSave = async (category) => {
    const { title, amount } = editBillInputs;
    if (!title || !amount || isNaN(amount)) return;
    const id = getBillIdByIndex(category, editBillIdx);
    if (!id) {
      setExpenseError('Unable to update bill: missing id.');
      return;
    }
    try {
      const res = await fetch(`http://localhost:5000/api/expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, amount })
      });
      if (!res.ok) {
        setExpenseError('Failed to update bill.');
        return;
      }
      setBills(prev => {
        const updated = { ...prev };
        updated[category] = updated[category].map((bill, idx) =>
          idx === editBillIdx ? { ...bill, title, amount: parseFloat(amount) } : bill
        );
        return updated;
      });
      setEditBillIdx(null);
      setEditBillInputs({ title: '', amount: '' });
    } catch (err) {
      setExpenseError('Server error. Please try again.');
    }
  };

  const handleDeleteBill = async (category, billIdx) => {
    const id = getBillIdByIndex(category, billIdx);
    if (!id) {
      setExpenseError('Unable to delete bill: missing id.');
      return;
    }
    try {
      const res = await fetch(`http://localhost:5000/api/expenses/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok && res.status !== 204) {
        setExpenseError('Failed to delete bill.');
        return;
      }
      setBills(prev => {
        const updated = { ...prev };
        updated[category] = updated[category].filter((_, idx) => idx !== billIdx);
        return updated;
      });
    } catch (err) {
      setExpenseError('Server error. Please try again.');
    }
  };

  const handleCategoryClick = async (category) => {
    setCurrentView('bills');
    setViewCategory(category);
    setBillSuccessMsg('');
    setExpenseError('');
    try {
      const res = await fetch(`http://localhost:5000/api/expenses?username=${encodeURIComponent(username)}&category=${encodeURIComponent(category)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setExpenseError(data.error || 'Failed to fetch bills.');
        setBills(prev => ({ ...prev, [category]: [] }));
        return;
      }
      const data = await res.json();
      // Store _id from backend for edit/delete
      setBills(prev => ({
        ...prev,
        [category]: data.map(bill => ({
          _id: bill._id,
          title: bill.title,
          amount: bill.amount,
          date: bill.date || new Date().toISOString().slice(0, 10)
        }))
      }));
    } catch (err) {
      setExpenseError('Server error. Please try again.');
      setBills(prev => ({ ...prev, [category]: [] }));
    }
  };

  const handleDeleteCategory = (categoryToDelete) => {
    setCategories(categories.filter(cat => cat !== categoryToDelete));
    // Optionally, remove any billInputs and showBillInput for this category
    const newBillInputs = { ...billInputs };
    delete newBillInputs[categoryToDelete];
    setBillInputs(newBillInputs);
    const newShowBillInput = { ...showBillInput };
    delete newShowBillInput[categoryToDelete];
    setShowBillInput(newShowBillInput);
    if (activeBillCategory === categoryToDelete) setActiveBillCategory(null);
  };

  // Helper to get all today's bills across all categories
  const getTodaysBills = () => {
    const today = new Date().toISOString().slice(0, 10);
    let allBills = [];
    Object.entries(bills).forEach(([category, categoryBills]) => {
      if (Array.isArray(categoryBills)) {
        categoryBills.forEach(bill => {
          if (bill.date === today) {
            allBills.push({ category, ...bill });
          }
        });
      }
    });
    return allBills;
  };

  // Helper to get today's total spent (across all categories)
  const getTodaysTotalSpent = () => {
    const today = new Date().toISOString().slice(0, 10);
    let total = 0;
    Object.values(bills).forEach(categoryBills => {
      if (Array.isArray(categoryBills)) {
        total += categoryBills.filter(bill => bill.date === today).reduce((sum, bill) => sum + (parseFloat(bill.amount) || 0), 0);
      }
    });
    return total;
  };

  // Helper to get total spent (all time)
  const getTotalSpent = () => {
    let total = 0;
    Object.values(bills).forEach(categoryBills => {
      if (Array.isArray(categoryBills)) {
        total += categoryBills.reduce((sum, bill) => sum + (parseFloat(bill.amount) || 0), 0);
      }
    });
    return total;
  };

  // Helper to get total balance (income - total spent)
  const getTotalBalance = () => {
    return parseFloat(income || 0) - getTotalSpent();
  };

  // Helper to get today's balance (income - today's spent)
  const getTodaysBalance = () => {
    return parseFloat(income || 0) - getTodaysTotalSpent();
  };

  const handleAddBill = async (category) => {
    const { title, amount } = billInputs[category] || {};
    if (!title || !amount || isNaN(amount)) {
      setExpenseError('Please enter a valid title and amount.');
      return;
    }
    // Check category limit
    const categoryLimit = categoryLimits[category];
    const totalInCategory = (bills[category] || []).reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);
    if (parseFloat(totalInCategory) + parseFloat(amount) > parseFloat(categoryLimit)) {
      setExpenseError('Adding this bill exceeds the category limit.');
      return;
    }
    // Enforce daily limit with confirmation
    const today = new Date().toISOString().slice(0, 10);
    const todaysTotal = getTodaysTotalSpent();
    if (parseFloat(todaysTotal) + parseFloat(amount) > parseFloat(dailyLimit)) {
      const confirmOverLimit = window.confirm('Adding this bill exceeds your daily limit. Do you want to continue?');
      if (!confirmOverLimit) {
        setExpenseError('Bill addition cancelled.');
        return;
      }
    }
    try {
      const res = await fetch('http://localhost:5000/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, category, title, amount: parseFloat(amount) })
      });
      if (!res.ok) {
        setExpenseError('Failed to add bill.');
        return;
      }
      // Add bill to local state
      setBills(prev => {
        const updated = { ...prev };
        const newBill = { title, amount: parseFloat(amount), date: today };
        updated[category] = updated[category] ? [...updated[category], newBill] : [newBill];
        return updated;
      });
      setBillInputs(prev => ({ ...prev, [category]: { title: '', amount: '' } }));
      setBillSuccessMsg('Bill added successfully!');
      setExpenseError('');
    } catch (err) {
      setExpenseError('Server error. Please try again.');
    }
  };

  // --- Helper for dashboard: get top 3 spent days ---
  function getTopSpentDays() {
    // { 'YYYY-MM-DD': total }
    const dayTotals = {};
    Object.values(bills).flat().forEach(bill => {
      if (!bill.date) return;
      dayTotals[bill.date] = (dayTotals[bill.date] || 0) + (parseFloat(bill.amount) || 0);
    });
    return Object.entries(dayTotals)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
  }

  const handleAiSend = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    setAiMessages(msgs => [...msgs, { from: 'user', text: aiInput }]);
    try {
      const res = await fetch('http://localhost:5000/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiInput })
      });
      const data = await res.json();
      setAiMessages(msgs => [...msgs, { from: 'ai', text: data.response }]);
    } catch {
      setAiMessages(msgs => [...msgs, { from: 'ai', text: 'Sorry, AI is unavailable.' }]);
    }
    setAiInput('');
    setAiLoading(false);
  };

  if (loggedIn) {
    // Dashboard view
    if (showDashboard) {
      return (
        <div className="dashboard-page" style={{ minHeight: '100vh', background: '#FFF3E0', display: 'flex', flexDirection: 'row' }}>
          {/* Left card: Month and top 3 spent days */}
          <div style={{ width: 260, margin: '40px 0 0 40px', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(255,152,0,0.10)', padding: 24, height: 'fit-content' }}>
            <div style={{ fontWeight: 700, color: '#FB8C00', fontSize: '1.1rem', marginBottom: 8 }}>{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
            <div style={{ fontWeight: 600, color: '#1976d2', marginBottom: 8 }}>Top 3 Spent Days</div>
            <ol style={{ paddingLeft: 18, margin: 0 }}>
              {getTopSpentDays().map((d, i) => (
                <li key={i} style={{ color: '#FB8C00', fontWeight: 500, marginBottom: 4 }}>{d.date}: ₹ {d.amount.toLocaleString()}</li>
              ))}
            </ol>
          </div>
          {/* Main dashboard content */}
          <div style={{ flex: 1, margin: '40px 40px 0 32px' }}>
            <h2 style={{ color: '#FB8C00', marginBottom: 24 }}>Days spent & Analysis</h2>
            {/* Heatmap placeholder */}
            <div style={{ marginBottom: 32 }}>
              <Heatmap bills={bills} />
            </div>
            {/* Category analysis */}
            <div>
              <h3 style={{ color: '#FB8C00', marginBottom: 12 }}>Category Analysis</h3>
              <CategoryAnalysis bills={bills} dailyLimit={dailyLimit} />
            </div>
          </div>
          <button style={{ position: 'absolute', top: 24, right: 32, background: '#FB8C00', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 20px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }} onClick={() => setShowDashboard(false)}>Back</button>
        </div>
      );
    }
    // Show daily limit edit page if editLimit is true
    if (editLimit) {
      // Only allow editing to a value <= initial daily limit
      const initialLimit = Math.floor((parseFloat(income) * 0.8) / getDaysInMonth());
      return (
        <div className="edit-limit-page" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="banner" style={{ background: '#fff !important', color: '#FB8C00', padding: '10px 0', textAlign: 'center', marginBottom: '0', borderRadius: '0 0 16px 16px', boxShadow: '0 2px 8px rgba(255,152,0,0.10)', width: '100%' }}>
            <div className="banner-message" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: 8, paddingRight: 24, marginLeft: 16, marginRight: 16 }}>
              <h2 style={{ color: '#FB8C00', margin: 0, fontSize: '1.5rem', flex: 1, textAlign: 'left' }}>{isReturning ? `Welcome back, ${username}!` : `Welcome, ${username}!`}</h2>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            <div style={{ margin: '0 auto', maxWidth: '350px', background: '#fff', borderRadius: '8px', padding: '24px 28px', boxShadow: '0 2px 8px rgba(255,152,0,0.10)' }}>
              <h4 style={{ color: '#FB8C00', marginBottom: '18px', textAlign: 'center' }}>Set Daily Spend Limit</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <input
                  type="number"
                  min="1"
                  max={initialLimit}
                  value={customLimit}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '' || (parseInt(val) <= initialLimit && parseInt(val) > 0)) setCustomLimit(val);
                  }}
                  style={{ flex: 1, padding: '10px', fontSize: '1.1rem', borderRadius: '6px', border: '1px solid #FFB74D', color: '#FB8C00', background: '#FFF3E0' }}
                />
                <span style={{ color: '#FB8C00', fontWeight: 600, fontSize: '1rem' }}>/ {initialLimit}</span>
              </div>
              <button style={{ background: '#FB8C00', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 20px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', width: '100%' }} onClick={handleLimitSave}>Save Limit</button>
            </div>
          </div>
        </div>
      );
    }
    if (currentView === 'bills' && viewCategory) {
      return (
        <div className="bills-page">
          <button className="back-btn" onClick={handleBackToHome} style={{ marginBottom: '16px' }}>← Back</button>
          <h3 style={{ textAlign: 'center', color: '#1565c0' }}>{viewCategory} Bills</h3>
          {bills[viewCategory] && bills[viewCategory].length > 0 ? (
            <table style={{ width: '100%', background: '#fff', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', marginBottom: '10px' }}>
              <thead>
                <tr style={{ background: '#e3f2fd' }}>
                  <th style={{ textAlign: 'left', padding: '6px 10px' }}>Title</th>
                  <th style={{ textAlign: 'right', padding: '6px 10px' }}>Amount</th>
                  <th style={{ padding: '6px 10px' }}>Edit</th>
                  <th style={{ padding: '6px 10px' }}>Delete</th>
                </tr>
              </thead>
              <tbody>
                {bills[viewCategory].map((bill, idx) => (
                  <tr key={idx}>
                    {editBillIdx === idx ? (
                      <>
                        <td style={{ padding: '6px 10px' }}>
                          <input type="text" value={editBillInputs.title} onChange={e => handleEditBillInputChange('title', e.target.value)} />
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                          <input type="number" value={editBillInputs.amount} onChange={e => handleEditBillInputChange('amount', e.target.value)} />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button onClick={() => handleEditBillSave(viewCategory)} style={{ color: '#388e3c', border: 'none', background: 'none', fontWeight: 600, cursor: 'pointer' }}>Save</button>
                          <button onClick={handleEditBillCancel} style={{ color: '#d32f2f', border: 'none', background: 'none', fontWeight: 600, cursor: 'pointer', marginLeft: 8 }}>Cancel</button>
                        </td>
                        <td></td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: '6px 10px' }}>{bill.title}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right' }}>₹ {bill.amount.toLocaleString()}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button onClick={() => handleEditBillClick(viewCategory, idx)} style={{ color: '#1976d2', border: 'none', background: 'none', fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="delete-bill-btn"
                            style={{ background: 'none', border: 'none', color: '#d32f2f', fontSize: '1.1rem', cursor: 'pointer' }}
                            title="Delete bill"
                            onClick={() => handleDeleteBill(viewCategory, idx)}
                          >
                            ❌
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ color: '#888', textAlign: 'center', margin: '10px 0' }}>No bills added yet.</div>
          )}
        </div>
      );
    }
    if (currentView === 'addBill' && viewCategory) {
      return (
        <div className="bill-form-box bill-form-full">
          <button className="back-btn" onClick={handleBackToHome} style={{ marginBottom: '16px' }}>← Back</button>
          <span className="bill-category-title">Add Bill to <b>{viewCategory}</b></span>
          {billSuccessMsg && (
            <div style={{ color: 'green', marginBottom: '8px', textAlign: 'center', fontWeight: 500 }}>
              {billSuccessMsg}
            </div>
          )}
          <input
            type="text"
            placeholder="Title"
            value={billInputs[viewCategory]?.title || ''}
            onChange={e => handleBillInputChange(viewCategory, 'title', e.target.value)}
            required
            className="bill-title-input"
          />
          <input
            type="number"
            placeholder="Amount"
            min="0"
            max={income}
            value={billInputs[viewCategory]?.amount || ''}
            onChange={e => handleBillInputChange(viewCategory, 'amount', e.target.value)}
            required
            className="bill-amount-input"
          />
          {/*
          <div style={{ marginTop: 16, marginBottom: 8, textAlign: 'center', color: '#FB8C00', fontWeight: 600 }}>
            Category Limit: ₹ {categoryLimits[viewCategory] || 0}
          </div>
          */}
          <button className="bill-add-btn" onClick={() => handleAddBill(viewCategory)}>Add</button>
          {expenseError && <div className="expense-error">{expenseError}</div>}
        </div>
      );
    }
    if (showTodaysBills) {
      const today = new Date();
      const dateString = today.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const billsToday = getTodaysBills();
      return (
        <div className="todays-bills-modal" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="banner" style={{ background: '#fff !important', color: '#FB8C00', padding: '10px 0', textAlign: 'center', marginBottom: '0', borderRadius: '0 0 16px 16px', boxShadow: '0 2px 8px rgba(255,152,0,0.10)', width: '100%' }}>
            <div className="banner-message" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: 8, paddingRight: 24, marginLeft: 16, marginRight: 16 }}>
              <h2 style={{ color: '#FB8C00', margin: 0, fontSize: '1.5rem', flex: 1, textAlign: 'left' }}>Today's Bills</h2>
            </div>
          </div>
          <div style={{ margin: '32px auto 0', maxWidth: '500px', width: '100%', background: '#fff', borderRadius: '8px', padding: '24px 28px', boxShadow: '0 2px 8px rgba(255,152,0,0.10)' }}>
            <div style={{ textAlign: 'center', color: '#FB8C00', fontWeight: 600, fontSize: '1.2rem', marginBottom: 16 }}>{dateString}</div>
            {billsToday.length > 0 ? (
              <table style={{ width: '100%', background: '#fff', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', marginBottom: '10px' }}>
                <thead>
                  <tr style={{ background: '#FFE0B2' }}>
                    <th style={{ textAlign: 'left', padding: '6px 10px' }}>Category</th>
                    <th style={{ textAlign: 'left', padding: '6px 10px' }}>Title</th>
                    <th style={{ textAlign: 'right', padding: '6px 10px' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {billsToday.map((bill, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '6px 10px' }}>{bill.category}</td>
                      <td style={{ padding: '6px 10px' }}>{bill.title}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>₹ {parseFloat(bill.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ color: '#888', textAlign: 'center', margin: '10px 0' }}>No bills added today.</div>
            )}
            <button style={{ marginTop: 16, background: '#FB8C00', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 20px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', width: '100%' }} onClick={() => setShowTodaysBills(false)}>Back</button>
          </div>
        </div>
      );
    }
    return (
      <div className="home-container">
        <div className="banner">
          <div className="banner-message" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: 8, paddingRight: 24, marginLeft: 16, marginRight: 16 }}>
            <h2 style={{ color: '#FB8C00', margin: 0, flex: 1, textAlign: 'left' }}>{isReturning ? `Welcome back, ${username}!` : `Welcome, ${username}!`}</h2>
            <button style={{ marginLeft: 16, background: '#FF9800', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 16px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }} onClick={() => setShowTodaysBills(true)}>Today's Bills</button>
            {incomeSubmitted && (
              <div style={{ marginLeft: 24, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ color: '#FB8C00', fontWeight: 600, fontSize: '1rem' }}>Total Spent: ₹ {getTotalSpent().toLocaleString()}</span>
                <span style={{ color: '#388e3c', fontWeight: 600, fontSize: '1rem' }}>Total Balance: ₹ {getTotalBalance().toLocaleString()}</span>
                <span style={{ color: '#FB8C00', fontWeight: 600, fontSize: '1rem', marginTop: 4 }}>Today Spent: ₹ {getTodaysTotalSpent().toLocaleString()}</span>
                <span style={{ color: '#388e3c', fontWeight: 600, fontSize: '1rem' }}>Today Balance: ₹ {getTodaysBalance().toLocaleString()}</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: 8, paddingRight: 24 }}>
            {incomeSubmitted && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: '24px' }}>
                  <span style={{ fontWeight: 600, color: '#FB8C00', fontSize: '1.1rem' }}>Daily Limit</span>
                  <span style={{ fontSize: '1.3rem', color: '#FF9800', fontWeight: 700 }}>₹ {parseFloat(dailyLimit).toLocaleString()}</span>
                  <button style={{ fontSize: '0.95rem', color: '#FB8C00', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600, marginLeft: 6 }} onClick={() => setEditLimit(true)}>Edit</button>
                </div>
                <span className="income-amount-large" style={{ color: '#FB8C00', fontWeight: 700, marginLeft: 0, marginRight: 16 }}>₹ {parseFloat(income).toLocaleString()}</span>
              </>
            )}
          </div>
        </div>
        {/* Dashboard button below the banner, right side */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 32px 0 0' }}>
          <button style={{ background: '#FB8C00', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 24px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }} onClick={() => setShowDashboard(true)}>Dashboard</button>
        </div>
        {incomeSubmitted && !editLimit && (
          <div className="main-content">
            {!activeBillCategory ? (
              <>
                <h3 className="track-expenses-title">Track Expenses</h3>
                <button className="add-category-btn" onClick={() => setShowCategoryInput(true)}>Add Category</button>
                {showCategoryInput && (
                  <form className="category-form" onSubmit={handleAddCategory}>
                    <input
                      type="text"
                      placeholder="Category name"
                      value={categoryName}
                      onChange={e => setCategoryName(e.target.value)}
                      required
                      className="category-input"
                    />
                    <input
                      type="number"
                      placeholder="Category limit"
                      value={categoryLimitInput}
                      onChange={e => setCategoryLimitInput(e.target.value)}
                      required
                      className="category-limit-input"
                    />
                    <button type="submit" className="category-add-btn">Add</button>
                  </form>
                )}
                <div className="categories-list" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                  {categories.map(category => (
                    <div
                      className="category-row"
                      key={category}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '350px',
                        margin: '10px 0',
                        background: '#f5f5f5',
                        borderRadius: '8px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                        padding: '10px 16px',
                        position: 'relative',
                        flexDirection: 'column',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <button
                          className="category-btn"
                          style={{
                            flex: 1,
                            textAlign: 'center',
                            background: activeBillCategory === category ? '#1565c0' : '#1976d2',
                            color: '#fff',
                            border: 'none',
                            fontSize: '1.1rem',
                            fontWeight: 500,
                            borderRadius: '6px',
                            padding: '8px 0',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                            boxShadow: activeBillCategory === category ? '0 2px 8px rgba(21,101,192,0.15)' : '0 2px 6px rgba(33,150,243,0.10)'
                          }}
                          onClick={() => handleCategoryClick(category)}
                        >
                          {category}
                        </button>
                        <button className="add-bill-btn" onClick={() => handleShowBillInput(category)} style={{ marginLeft: '10px' }}>Add Bills</button>
                        <button
                          className="delete-category-btn"
                          style={{
                            marginLeft: '10px',
                            background: 'none',
                            border: 'none',
                            color: '#d32f2f',
                            fontSize: '1.2rem',
                            cursor: 'pointer',
                          }}
                          title="Delete category"
                          onClick={() => handleDeleteCategory(category)}
                        >
                          ❌
                        </button>
                      </div>
                      {activeBillCategory === category && (
                        <div style={{ width: '100%', marginTop: '10px' }}>
                          {/* Only show bills for the selected category, fetched from backend */}
                          {bills[category] && bills[category].length > 0 ? (
                            <table style={{ width: '100%', background: '#fff', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', marginBottom: '10px' }}>
                              <thead>
                                <tr style={{ background: '#e3f2fd' }}>
                                  <th style={{ textAlign: 'left', padding: '6px 10px' }}>Title</th>
                                  <th style={{ textAlign: 'right', padding: '6px 10px' }}>Amount</th>
                                  <th style={{ padding: '6px 10px' }}>Edit</th>
                                  <th style={{ padding: '6px 10px' }}>Delete</th>
                                </tr>
                              </thead>
                              <tbody>
                                {bills[category].map((bill, idx) => (
                                  <tr key={idx}>
                                    {editBillIdx === idx ? (
                                      <>
                                        <td style={{ padding: '6px 10px' }}>
                                          <input type="text" value={editBillInputs.title} onChange={e => handleEditBillInputChange('title', e.target.value)} />
                                        </td>
                                        <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                                          <input type="number" value={editBillInputs.amount} onChange={e => handleEditBillInputChange('amount', e.target.value)} />
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                          <button onClick={() => handleEditBillSave(category)} style={{ color: '#388e3c', border: 'none', background: 'none', fontWeight: 600, cursor: 'pointer' }}>Save</button>
                                          <button onClick={handleEditBillCancel} style={{ color: '#d32f2f', border: 'none', background: 'none', fontWeight: 600, cursor: 'pointer', marginLeft: 8 }}>Cancel</button>
                                        </td>
                                        <td></td>
                                      </>
                                    ) : (
                                      <>
                                        <td style={{ padding: '6px 10px' }}>{bill.title}</td>
                                        <td style={{ padding: '6px 10px', textAlign: 'right' }}>₹ {bill.amount.toLocaleString()}</td>
                                        <td style={{ textAlign: 'center' }}>
                                          <button onClick={() => handleEditBillClick(category, idx)} style={{ color: '#1976d2', border: 'none', background: 'none', fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                          <button
                                            className="delete-bill-btn"
                                            style={{ background: 'none', border: 'none', color: '#d32f2f', fontSize: '1.1rem', cursor: 'pointer' }}
                                            title="Delete bill"
                                            onClick={() => handleDeleteBill(category, idx)}
                                          >
                                            ❌
                                          </button>
                                        </td>
                                      </>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div style={{ color: '#888', textAlign: 'center', margin: '10px 0' }}>No bills added yet.</div>
                          )}
                          {/* Show bill add form for this category if needed */}
                          {showBillInput[category] && (
                            <div className="bill-form-box bill-form-full">
                              <div className="bill-form-header">
                                <button className="back-btn" onClick={handleBackToHome}>← Back</button>
                                <span className="bill-category-title">Add Bill to <b>{activeBillCategory}</b></span>
                              </div>
                              {billSuccessMsg && (
                                <div style={{ color: 'green', marginBottom: '8px', textAlign: 'center', fontWeight: 500 }}>
                                  {billSuccessMsg}
                                </div>
                              )}
                              <input
                                type="text"
                                placeholder="Title"
                                value={billInputs[activeBillCategory]?.title || ''}
                                onChange={e => handleBillInputChange(activeBillCategory, 'title', e.target.value)}
                                required
                                className="bill-title-input"
                              />
                              <input
                                type="number"
                                placeholder="Amount"
                                min="0"
                                max={income}
                                value={billInputs[activeBillCategory]?.amount || ''}
                                onChange={e => handleBillInputChange(activeBillCategory, 'amount', e.target.value)}
                                required
                                className="bill-amount-input"
                              />
                              {/*
                              <div style={{ marginTop: 16, marginBottom: 8, textAlign: 'center', color: '#FB8C00', fontWeight: 600 }}>
                                Category Limit: ₹ {categoryLimits[activeBillCategory] || 0}
                              </div>
                              */}
                              <button className="bill-add-btn" onClick={() => handleAddBill(activeBillCategory)}>Add</button>
                              {expenseError && <div className="expense-error">{expenseError}</div>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {expenseError && <div className="expense-error">{expenseError}</div>}
                </div>
              </>
            ) : (
              <div className="bill-form-box bill-form-full">
                <div className="bill-form-header">
                  <button className="back-btn" onClick={handleBackToHome}>← Back</button>
                  <span className="bill-category-title">Add Bill to <b>{activeBillCategory}</b></span>
                </div>
                {billSuccessMsg && (
                  <div style={{ color: 'green', marginBottom: '8px', textAlign: 'center', fontWeight: 500 }}>
                    {billSuccessMsg}
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Title"
                  value={billInputs[activeBillCategory]?.title || ''}
                  onChange={e => handleBillInputChange(activeBillCategory, 'title', e.target.value)}
                  required
                  className="bill-title-input"
                />
                <input
                  type="number"
                  placeholder="Amount"
                  min="0"
                  max={income}
                  value={billInputs[activeBillCategory]?.amount || ''}
                  onChange={e => handleBillInputChange(activeBillCategory, 'amount', e.target.value)}
                  required
                  className="bill-amount-input"
                />
                {/*
                <div style={{ marginTop: 16, marginBottom: 8, textAlign: 'center', color: '#FB8C00', fontWeight: 600 }}>
                  Category Limit: ₹ {categoryLimits[activeBillCategory] || 0}
                </div>
                */}
                <button className="bill-add-btn" onClick={() => handleAddBill(activeBillCategory)}>Add</button>
                {expenseError && <div className="expense-error">{expenseError}</div>}
              </div>
            )}
          </div>
        )}
        <div className="income-section">
          {!incomeSubmitted ? (
            <form onSubmit={handleIncomeSubmit} className="income-form">
              <label htmlFor="income-input">Enter your total income:</label>
              <input
                id="income-input"
                type="number"
                min="0"
                value={income}
                onChange={e => setIncome(e.target.value)}
                required
              />
              <button type="submit">Submit</button>
            </form>
          ) : null}
        </div>
        {(
          <div className="ai-assist-box" style={{ position: 'fixed', bottom: 20, right: 20, width: 320, background: '#fff', borderRadius: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.10)', zIndex: 1000 }}>
            <div style={{ background: '#FF9800', color: '#fff', borderRadius: '10px 10px 0 0', padding: 10, fontWeight: 600 }}>AI Assistant</div>
            <div style={{ maxHeight: 220, overflowY: 'auto', padding: 10 }}>
              {aiMessages.map((msg, i) => (
                <div key={i} style={{ margin: '6px 0', textAlign: msg.from === 'user' ? 'right' : 'left' }}>
                  <span style={{ background: msg.from === 'user' ? '#FFE0B2' : '#FFF3E0', borderRadius: 6, padding: '6px 10px', display: 'inline-block' }}>{msg.text}</span>
                </div>
              ))}
              {aiLoading && <div style={{ color: '#888', fontStyle: 'italic' }}>Thinking...</div>}
            </div>
            <div style={{ display: 'flex', borderTop: '1px solid #FFE0B2' }}>
              <input
                type="text"
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAiSend(); }}
                placeholder="Ask me anything..."
                style={{ flex: 1, border: 'none', padding: 10, borderRadius: '0 0 0 10px', outline: 'none' }}
                disabled={aiLoading}
              />
              <button onClick={handleAiSend} disabled={aiLoading || !aiInput.trim()} style={{ background: '#FB8C00', color: '#fff', border: 'none', borderRadius: '0 0 10px 0', padding: '0 18px', fontWeight: 600, cursor: 'pointer' }}>Send</button>
            </div>
          </div>
        )}
      </div>
    )
  }
  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleLogin}>
        <h2>Login</h2>
        <input
          type="text"
          placeholder="Name"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button type="submit">Login</button>
        {error && <div className="error">{error}</div>}
      </form>
    </div>
  );
}

// --- Heatmap and CategoryAnalysis components ---
function Heatmap({ bills }) {
  // For simplicity, show a grid of days with color intensity by total spent
  const daysInMonth = new Date().getDate();
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const dayTotals = Array(daysInMonth).fill(0);
  Object.values(bills).flat().forEach(bill => {
    if (!bill.date) return;
    const d = new Date(bill.date);
    if (d.getMonth() === month && d.getFullYear() === year) {
      dayTotals[d.getDate() - 1] += parseFloat(bill.amount) || 0;
    }
  });
  const max = Math.max(...dayTotals, 1);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 36px)', gap: 6 }}>
      {dayTotals.map((amt, i) => (
        <div key={i} title={`Day ${i + 1}: ₹${amt.toLocaleString()}`}
          style={{ width: 36, height: 36, borderRadius: 6, background: `rgba(255,152,0,${amt/max*0.85+0.15})`, color: amt > max*0.5 ? '#fff' : '#FB8C00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
          {i + 1}
        </div>
      ))}
    </div>
  );
}
function CategoryAnalysis({ bills, dailyLimit }) {
  // For each category, show total spent, saved, and percent of daily limit used
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const analysis = Object.entries(bills).map(([cat, arr]) => {
    const total = arr.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);
    const saved = (parseFloat(dailyLimit) * daysInMonth) - total;
    return { cat, total, saved };
  });
  return (
    <table style={{ width: '100%', background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', marginBottom: 10 }}>
      <thead>
        <tr style={{ background: '#FFE0B2' }}>
          <th style={{ textAlign: 'left', padding: '8px 12px' }}>Category</th>
          <th style={{ textAlign: 'right', padding: '8px 12px' }}>Spent</th>
          <th style={{ textAlign: 'right', padding: '8px 12px' }}>Saved</th>
        </tr>
      </thead>
      <tbody>
        {analysis.map(({ cat, total, saved }) => (
          <tr key={cat}>
            <td style={{ padding: '8px 12px' }}>{cat}</td>
            <td style={{ padding: '8px 12px', textAlign: 'right' }}>₹ {total.toLocaleString()}</td>
            <td style={{ padding: '8px 12px', textAlign: 'right', color: saved < 0 ? '#d32f2f' : '#388e3c' }}>₹ {saved.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default App;