"use client";

import React, { useEffect, useState } from "react";
import { useAppContext } from "@/context/AppProvider";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { 
  ArrowPathIcon, 
  BookOpenIcon, 
  ClockIcon, 
  UserCircleIcon, 
  CheckCircleIcon, 
  PlusIcon, 
  ExclamationCircleIcon, 
  BookmarkIcon 
} from '@heroicons/react/24/outline';
import dynamic from 'next/dynamic';

// Dynamically import ProfileModal with no SSR
const ProfileModal = dynamic(() => import('@/components/ProfileModal'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-indigo-400"></div>
    </div>
  ),
});

interface Book {
  id: number;
  title: string;
  author: string;
  genre: string;
  description: string;
  available_copies: number;
  total_copies: number;
  borrowed_at?: string;
  due_date?: string;
  returned_date?: string;
  added_by?: string;
  user?: {
    name: string;
  };
  transaction_id: number;
  unique_key?: string;
  status?: string;
}

const UserDashboard = () => {
  const { authToken, user, isLoading } = useAppContext();
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [borrowedBooks, setBorrowedBooks] = useState<Book[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "available" | "borrowed">("all");
  const [loading, setLoading] = useState({
    books: false,
    borrowed: false,
    action: false,
    refreshing: false
  });
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Update current time every second
  useEffect(() => {
    const updateTime = () => {
      setLastUpdated(new Date().toLocaleTimeString());
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (authToken && !isLoading) {
      fetchBooks();
      fetchBorrowedBooks();
    }
  }, [authToken, isLoading]);

  const fetchBooks = async () => {
    if (loading.books) return; // Prevent multiple simultaneous requests
    setLoading(prev => ({...prev, books: true}));
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/books`,
        {
          headers: { 
            Authorization: `Bearer ${authToken}`,
            Accept: 'application/json',
            'Cache-Control': 'no-cache'
          }
        }
      );
      
      const data = Array.isArray(response.data) ? response.data : 
                  response.data.books ? response.data.books : 
                  response.data.data ? response.data.data : [];
      
      const formattedBooks = data.map((book: any) => ({
        id: book.id,
        title: book.title || 'No Title',
        author: book.author || 'Unknown Author',
        genre: book.genre || 'Uncategorized',
        description: book.description || 'No description available',
        available_copies: book.available_copies || 0,
        total_copies: book.total_copies || 0,
        added_by: book.user?.name || 'Admin'
      }));
      
      setBooks(formattedBooks);
    } catch (error: any) {
      console.error('Book fetch error:', error);
      toast.error(
        error.response?.data?.message || 
        error.response?.data?.error || 
        "Failed to load books"
      );
    } finally {
      setLoading(prev => ({...prev, books: false}));
    }
  };

  const fetchBorrowedBooks = async () => {
    if (loading.borrowed) return; // Prevent multiple simultaneous requests
    setLoading(prev => ({...prev, borrowed: true}));
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/user/borrowed-books`,
        {
          headers: { 
            Authorization: `Bearer ${authToken}`,
            Accept: 'application/json',
            'Cache-Control': 'no-cache'
          }
        }
      );
      
      const data = Array.isArray(response.data) ? response.data : 
                  response.data.books ? response.data.books : 
                  response.data.data ? response.data.data : [];
      
      const formattedBooks = data.map((book: any) => ({
        id: book.id,
        title: book.title || 'No Title',
        author: book.author || 'Unknown Author',
        genre: book.genre || 'Uncategorized',
        description: book.description || 'No description available',
        available_copies: book.available_copies || 0,
        total_copies: book.total_copies || 0,
        transaction_id: book.transaction_id || book.id,
        status: book.status || 'borrowed',
        due_date: book.due_date || null,
        borrowed_at: book.borrowed_at || null,
        returned_date: book.returned_date || null,
        unique_key: `${book.id}-${book.transaction_id || book.id}-${Date.now()}`
      }));
      
      setBorrowedBooks(formattedBooks);
    } catch (error: any) {
      console.error('Borrowed books fetch error:', error);
      toast.error(
        error.response?.data?.message || 
        error.response?.data?.error || 
        "Failed to load borrowed books"
      );
    } finally {
      setLoading(prev => ({...prev, borrowed: false}));
    }
  };

  const refreshData = async () => {
    if (loading.refreshing) return; // Prevent multiple simultaneous refreshes
    setLoading(prev => ({...prev, refreshing: true}));
    try {
      await Promise.all([fetchBooks(), fetchBorrowedBooks()]);
      toast.success("Data refreshed successfully");
    } catch (error) {
      console.error('Refresh error:', error);
      toast.error("Failed to refresh data");
    } finally {
      setLoading(prev => ({...prev, refreshing: false}));
    }
  };

  const handleBorrow = async (bookId: number) => {
    if (!dueDate) {
      toast.error("Please select a return date");
      return;
    }

    const today = new Date();
    const maxDueDate = new Date();
    maxDueDate.setDate(today.getDate() + 7);

    if (dueDate > maxDueDate) {
      toast.error("Maximum borrowing period is 1 week");
      return;
    }

    if (dueDate < today) {
      toast.error("Return date cannot be in the past");
      return;
    }

    setLoading(prev => ({...prev, action: true}));
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/books/${bookId}/borrow`,
        { due_date: dueDate.toISOString().split('T')[0] },
        { 
          headers: { 
            Authorization: `Bearer ${authToken}`,
            Accept: 'application/json'
          }
        }
      );
      
      toast.success(response.data?.message || "Book borrowed successfully");
      setDueDate(null);
      setSelectedBookId(null);
      await Promise.all([fetchBooks(), fetchBorrowedBooks()]);
    } catch (error: any) {
      console.error('Borrow error:', error);
      toast.error(
        error.response?.data?.message || 
        error.response?.data?.error || 
        "Failed to borrow book"
      );
    } finally {
      setLoading(prev => ({...prev, action: false}));
    }
  };

  const handleReturn = async (transactionId: number, bookTitle: string) => {
    if (!authToken) {
      toast.error("Authentication required");
      return;
    }

    try {
      const result = await Swal.fire({
        title: "Confirm Return",
        text: `Are you sure you want to return "${bookTitle}"?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, return it",
      });

      if (result.isConfirmed) {
        setLoading(prev => ({...prev, action: true}));
        
        try {
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/transactions/${transactionId}/return`,
            {},
            {
              headers: { 
                Authorization: `Bearer ${authToken}`,
                Accept: 'application/json',
                'Content-Type': 'application/json'
              }
            }
          );

          if (response.data?.success) {
            toast.success(response.data.message || "Book returned successfully");
            await Promise.all([fetchBooks(), fetchBorrowedBooks()]);
          } else {
            throw new Error(response.data?.message || "Failed to process return");
          }
        } catch (error: any) {
          console.error('Return error:', error);
          let errorMessage = "Failed to return book";
          
          if (error.response) {
            if (error.response.status === 404) {
              errorMessage = "Transaction not found";
            } else if (error.response.status === 403) {
              errorMessage = "You are not authorized to return this book";
            } else if (error.response.status === 400) {
              errorMessage = error.response.data?.message || "This book was already returned";
            } else if (error.response.data?.message) {
              errorMessage = error.response.data.message;
            }
          }
          
          toast.error(errorMessage);
        } finally {
          setLoading(prev => ({...prev, action: false}));
        }
      }
    } catch (error) {
      console.error('Confirmation error:', error);
      toast.error("An error occurred during confirmation");
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return "N/A";
    }
  };

  const formatReturnDate = (dateString?: string) => {
    if (!dateString) return "Not returned yet";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return "Invalid Date";
    }
  };

  const isBookOverdue = (dueDateString?: string) => {
    if (!dueDateString) return false;
    const dueDate = new Date(dueDateString);
    return dueDate < new Date();
  };

  if (isLoading || !authToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (user?.role === 'admin') {
    router.push('/admin');
    return null;
  }

  const filteredBooks = activeTab === "available" 
    ? books.filter(book => book.available_copies > 0)
    : activeTab === "borrowed" 
      ? borrowedBooks 
      : books;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50"></div>
      
      {/* Top Navigation Bar */}
      <nav className="bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-white">Digital Library Hub</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={refreshData}
                disabled={loading.refreshing}
                className="p-2 text-gray-300 hover:text-white rounded-lg hover:bg-gray-700/50 transition-all duration-200"
                title="Refresh Data"
              >
                <ArrowPathIcon className={`h-5 w-5 ${loading.refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowProfileModal(true)}
                className="p-2 text-gray-300 hover:text-white rounded-lg hover:bg-gray-700/50 transition-all duration-200"
                title="My Profile"
              >
                <UserCircleIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Welcome Section */}
            <div className="bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 rounded-3xl shadow-xl p-6 border border-gray-700/50 hover:shadow-2xl transition-all duration-300">
              <div className="flex flex-col items-center text-center">
                <button 
                  onClick={() => setShowProfileModal(true)}
                  className="group h-24 w-24 rounded-3xl bg-gray-700/50 backdrop-blur-sm flex items-center justify-center hover:bg-gray-700/70 transition-all duration-300 shadow-lg hover:shadow-gray-900/20 transform hover:scale-105 border border-gray-600 mb-4 relative"
                  title="Update Your Profile"
                >
                  {user?.profile_image ? (
                    <img 
                      src={`${process.env.NEXT_PUBLIC_API_URL}/storage/${user.profile_image}`} 
                      alt={user.name}
                      className="h-24 w-24 rounded-3xl object-cover ring-2 ring-gray-600"
                      onError={(e) => {
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=4B5563&color=fff`;
                      }}
                    />
                  ) : (
                    <span className="text-white text-4xl font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/50 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <span className="text-white text-sm font-medium">Edit Profile</span>
                  </div>
                </button>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Welcome back, {user?.name}!
                </h2>
                <p className="text-gray-300 text-sm">Manage your reading journey</p>
                <div className="mt-4 text-xs text-gray-400">
                  Last updated: {lastUpdated}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 rounded-3xl shadow-xl border border-gray-700/50 p-5 transform hover:scale-[1.02] transition-all duration-300 group">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-gray-700/50 backdrop-blur-sm rounded-2xl p-4 shadow-lg group-hover:bg-gray-700/70 transition-all duration-300">
                    <BookOpenIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-300">Your Collection</p>
                    <p className="text-2xl font-bold text-white group-hover:text-gray-100 transition-colors duration-200">{borrowedBooks.length}</p>
                    <p className="text-xs text-gray-400">active loans</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 rounded-3xl shadow-xl border border-gray-700/50 p-5 transform hover:scale-[1.02] transition-all duration-300 group">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-gray-700/50 backdrop-blur-sm rounded-2xl p-4 shadow-lg group-hover:bg-gray-700/70 transition-all duration-300">
                    <ExclamationCircleIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-300">Overdue Books</p>
                    <p className="text-2xl font-bold text-white group-hover:text-gray-100 transition-colors duration-200">
                      {borrowedBooks.filter(book => isBookOverdue(book.due_date)).length}
                    </p>
                    <p className="text-xs text-gray-400">need attention</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Guide */}
            <div className="bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 rounded-3xl shadow-xl p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <BookOpenIcon className="h-5 w-5 mr-2" />
                Quick Guide
              </h3>
              <ul className="text-sm text-gray-300 space-y-3">
                <li className="flex items-center p-3 rounded-xl hover:bg-gray-700/50 transition-all duration-200 group">
                  <CheckCircleIcon className="h-5 w-5 mr-3 text-emerald-400 group-hover:text-emerald-300 transition-colors duration-200" />
                  <span className="group-hover:text-gray-100 transition-colors duration-200">Books can be borrowed for up to 7 days</span>
                </li>
                <li className="flex items-center p-3 rounded-xl hover:bg-gray-700/50 transition-all duration-200 group">
                  <CheckCircleIcon className="h-5 w-5 mr-3 text-emerald-400 group-hover:text-emerald-300 transition-colors duration-200" />
                  <span className="group-hover:text-gray-100 transition-colors duration-200">Return books on time to maintain good standing</span>
                </li>
                <li className="flex items-center p-3 rounded-xl hover:bg-gray-700/50 transition-all duration-200 group">
                  <CheckCircleIcon className="h-5 w-5 mr-3 text-emerald-400 group-hover:text-emerald-300 transition-colors duration-200" />
                  <span className="group-hover:text-gray-100 transition-colors duration-200">Use the refresh button to update your reading status</span>
                </li>
                <li className="flex items-center p-3 rounded-xl hover:bg-gray-700/50 transition-all duration-200 group">
                  <CheckCircleIcon className="h-5 w-5 mr-3 text-emerald-400 group-hover:text-emerald-300 transition-colors duration-200" />
                  <span className="group-hover:text-gray-100 transition-colors duration-200">Click your profile picture to update your information</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Tabs */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-200 p-4">
              <nav className="flex space-x-4">
                <button
                  onClick={() => setActiveTab("all")}
                  className={`${
                    activeTab === "all"
                      ? "bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-lg"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  } flex-1 flex items-center justify-center px-6 py-4 rounded-2xl font-medium text-sm transition-all duration-200 group`}
                  disabled={loading.books || loading.borrowed}
                >
                  <BookOpenIcon className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
                  All Books
                  {loading.books && (
                    <span className="ml-2 inline-block animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent"></span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("available")}
                  className={`${
                    activeTab === "available"
                      ? "bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-lg"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  } flex-1 flex items-center justify-center px-6 py-4 rounded-2xl font-medium text-sm transition-all duration-200 group`}
                  disabled={loading.books || loading.borrowed}
                >
                  <PlusIcon className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
                  Available Now
                  {loading.books && (
                    <span className="ml-2 inline-block animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent"></span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("borrowed")}
                  className={`${
                    activeTab === "borrowed"
                      ? "bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-lg"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  } flex-1 flex items-center justify-center px-6 py-4 rounded-2xl font-medium text-sm transition-all duration-200 group`}
                  disabled={loading.borrowed}
                >
                  <BookmarkIcon className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
                  My Books
                  {loading.borrowed && (
                    <span className="ml-2 inline-block animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent"></span>
                  )}
                </button>
              </nav>
            </div>

            {/* Book List or Borrowed Books Table */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-200 p-6">
              {activeTab !== "borrowed" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {loading.books ? (
                    <div className="col-span-full">
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-600 border-t-gray-400 mx-auto"></div>
                        <p className="mt-4 text-gray-600 font-medium">Loading your reading options...</p>
                      </div>
                    </div>
                  ) : filteredBooks.length === 0 ? (
                    <div className="col-span-full">
                      <div className="text-center py-12">
                        <BookOpenIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">No books available at the moment.</p>
                        <p className="text-sm text-gray-500 mt-2">Check back later for new additions to our collection.</p>
                      </div>
                    </div>
                  ) : (
                    filteredBooks.map(book => (
                      <div key={`book-${book.id}`} className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 transform hover:-translate-y-1 group">
                        <div className="p-5">
                          <h3 className="text-lg font-bold text-gray-900 line-clamp-1 mb-1 group-hover:text-gray-800 transition-colors duration-200">{book.title}</h3>
                          <p className="text-sm text-gray-500 mb-3">by {book.author}</p>
                          <p className="text-sm text-gray-600 line-clamp-2 mb-4 group-hover:text-gray-700 transition-colors duration-200">{book.description || 'No description available'}</p>
                          <div className="space-y-2">
                            <div className="flex items-center text-sm text-gray-500 bg-gray-50 rounded-xl p-2 group-hover:bg-gray-100 transition-colors duration-200">
                              <BookmarkIcon className="h-4 w-4 mr-2 text-gray-600" />
                              <span className="line-clamp-1">{book.genre}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-500 bg-gray-50 rounded-xl p-2 group-hover:bg-gray-100 transition-colors duration-200">
                              <PlusIcon className="h-4 w-4 mr-2 text-gray-600" />
                              <span>{book.available_copies}/{book.total_copies} copies available</span>
                            </div>
                          </div>
                        </div>
                        <div className="px-5 py-4 bg-gray-50 border-t border-gray-200">
                          {selectedBookId === book.id ? (
                            <div className="space-y-3">
                              <DatePicker
                                selected={dueDate}
                                onChange={(date) => setDueDate(date)}
                                minDate={new Date()}
                                maxDate={new Date(new Date().setDate(new Date().getDate() + 7))}
                                className="w-full px-4 py-2 text-sm bg-white border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                placeholderText="Select return date"
                                dateFormat="MMM d, yyyy"
                              />
                              <div className="flex space-x-3">
                                <button
                                  className="flex-1 px-4 py-2 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-xl hover:from-gray-900 hover:to-gray-950 transition-all duration-200 shadow-lg hover:shadow-gray-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                  onClick={() => handleBorrow(book.id)}
                                  disabled={loading.action}
                                >
                                  {loading.action ? (
                                    <span className="flex items-center justify-center">
                                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></span>
                                      Processing...
                                    </span>
                                  ) : 'Confirm'}
                                </button>
                                <button
                                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200"
                                  onClick={() => {
                                    setSelectedBookId(null);
                                    setDueDate(null);
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              className={`w-full px-4 py-2 rounded-xl transition-all duration-200 ${
                                book.available_copies > 0
                                  ? 'bg-gradient-to-r from-gray-800 to-gray-900 text-white hover:from-gray-900 hover:to-gray-950 shadow-lg hover:shadow-gray-900/20'
                                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              }`}
                              onClick={() => book.available_copies > 0 && setSelectedBookId(book.id)}
                              disabled={book.available_copies <= 0 || loading.action}
                            >
                              {book.available_copies > 0 ? 'Borrow' : 'Unavailable'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loading.borrowed ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center">
                            <div className="flex justify-center items-center space-x-3">
                              <div className="animate-spin rounded-full h-6 w-6 border-3 border-gray-600 border-t-gray-400"></div>
                              <span className="text-gray-600 font-medium">Loading your reading list...</span>
                            </div>
                          </td>
                        </tr>
                      ) : borrowedBooks.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <BookOpenIcon className="h-16 w-16 text-gray-400 mb-4" />
                              <p className="text-gray-600 font-medium">Your reading list is empty.</p>
                              <p className="text-sm text-gray-500 mt-2">Start exploring our collection to find your next read!</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        borrowedBooks.map(book => (
                          <tr key={book.unique_key} className="hover:bg-gray-50 transition-colors duration-200">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{book.title}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{book.author}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                book.status === 'returned' 
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isBookOverdue(book.due_date)
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-amber-100 text-amber-800'
                              }`}>
                                {book.status === 'returned' ? 'Returned' : isBookOverdue(book.due_date) ? 'Overdue' : 'Currently Reading'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {book.status !== 'returned' ? (
                                <button
                                  className="px-4 py-2 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-xl hover:from-gray-900 hover:to-gray-950 transition-all duration-200 shadow-lg hover:shadow-gray-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                  onClick={() => handleReturn(book.transaction_id, book.title)}
                                  disabled={loading.action}
                                >
                                  {loading.action ? (
                                    <span className="flex items-center justify-center">
                                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></span>
                                      Returning...
                                    </span>
                                  ) : 'Return Book'}
                                </button>
                              ) : (
                                <button 
                                  className="px-4 py-2 bg-gray-100 text-gray-400 rounded-xl cursor-not-allowed"
                                  disabled
                                >
                                  Already Returned
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <ProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          user={user}
        />
      )}
    </div>
  );
};

export default UserDashboard;