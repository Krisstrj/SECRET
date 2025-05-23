"use client";

import React, { useEffect, useState } from "react";
import { useAppContext } from "@/context/AppProvider";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { 
  BookOpenIcon, 
  UserGroupIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  HomeIcon,
  UserCircleIcon,
  ExclamationCircleIcon,
  BookmarkIcon,
  UsersIcon,
  CalendarIcon,
  ChartBarIcon,
  DocumentTextIcon,
  UserPlusIcon,
  BookOpenIcon as BookIcon,
  ClipboardDocumentListIcon,
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import ProfileModal from "@/components/ProfileModal";

interface Book {
  id: number;
  title: string;
  author: string;
  genre: string;
  description: string;
  total_copies: number;
  available_copies: number;
  created_at: string;
  updated_at: string;
  added_by?: string;
  publisher: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
  profile_image?: string;
}
//
interface Transaction {
  id: number;
  book_id: number;
  user_id: number;
  borrowed_date: string;
  due_date: string;
  returned_date: string | null;
  status: 'borrowed' | 'returned';
  book: {
    title: string;
    author: string;
  };
  user: {
    name: string;
    email: string;
  };
}
//
interface DashboardStats {
  books_count: number;
  users_count: number;
  transactions_count: number;
  overdue_count: number;
  recent_transactions: {
    id: number;
    user_name: string;
    book_title: string;
    borrowed_date: string;
    due_date: string;
    returned_date?: string;
    status: string;
  }[];
}

const AdminDashboard: React.FC = () => {
  const { authToken, user, isLoading } = useAppContext();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"dashboard" | "books" | "users" | "transactions">("dashboard");
  const [loading, setLoading] = useState({
    dashboard: false,
    books: false,
    users: false,
    transactions: false,
    action: false
  });
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState({
    books: { current_page: 1, last_page: 1, per_page: 10, total: 0 },
    users: { current_page: 1, last_page: 1, per_page: 10, total: 0 },
    transactions: { current_page: 1, last_page: 1, per_page: 10, total: 0 }
  });
  const [searchTerm, setSearchTerm] = useState({
    books: "",
    users: "",
    transactions: ""
  });
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [showEditBookModal, setShowEditBookModal] = useState(false);
  const [newBook, setNewBook] = useState({
    title: "",
    author: "",
    genre: "",
    description: "",
    total_copies: 1,
    publisher: ""
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, message: "New book added: The Great Gatsby", time: "2 hours ago", read: false },
    { id: 2, message: "Overdue book reminder: To Kill a Mockingbird", time: "5 hours ago", read: false },
    { id: 3, message: "New user registration: John Doe", time: "1 day ago", read: true },
  ]);
  const [showProfileModal, setShowProfileModal] = useState(false);
//
  useEffect(() => {
    if (!isLoading) {
      if (!authToken) {
        router.push("/auth");
      } else if (user?.role !== 'admin') {
        router.push("/");
      } else {
        // Only fetch data if we're authenticated and have admin role
        fetchDashboardStats();
      }
    }
  }, [authToken, isLoading, router, user]);

  useEffect(() => {
    if (authToken && user?.role === 'admin') {
      switch (activeTab) {
        case "dashboard":
          fetchDashboardStats();
          break;
        case "books":
          fetchBooks();
          break;
        case "users":
          fetchUsers();
          break;
        case "transactions":
          fetchTransactions();
          break;
      }
    }
  }, [activeTab, authToken, user]);

  const fetchDashboardStats = async () => {
    setLoading(prev => ({...prev, dashboard: true}));
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/dashboard-stats`,
        {
          headers: { 
            Authorization: `Bearer ${authToken}`,
            Accept: 'application/json'
          }
        }
      );
      setStats(response.data.data);
    } catch (error: any) {
      console.error('Dashboard stats fetch error:', error);
      toast.error(
        error.response?.data?.message || 
        "Failed to load dashboard statistics"
      );
    } finally {
      setLoading(prev => ({...prev, dashboard: false}));
    }
  };

  const fetchBooks = async (page = 1, search = "") => {
    setLoading(prev => ({...prev, books: true}));
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/books`,
        {
          params: {
            page,
            search: search || undefined,
            per_page: pagination.books.per_page
          },
          headers: { 
            Authorization: `Bearer ${authToken}`,
            Accept: 'application/json'
          }
        }
      );
      
      setBooks(response.data.data);
      setPagination(prev => ({
        ...prev,
        books: {
          current_page: response.data.meta?.current_page || 1,
          last_page: response.data.meta?.last_page || 1,
          per_page: response.data.meta?.per_page || 10,
          total: response.data.meta?.total || 0
        }
      }));
    } catch (error: any) {
      console.error('Books fetch error:', error);
      toast.error(
        error.response?.data?.message || 
        "Failed to load books"
      );
    } finally {
      setLoading(prev => ({...prev, books: false}));
    }
  };

  const fetchUsers = async (page = 1, search = "") => {
    setLoading(prev => ({...prev, users: true}));
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/users`,
        {
          params: {
            page,
            search: search || undefined,
            per_page: pagination.users.per_page
          },
          headers: { 
            Authorization: `Bearer ${authToken}`,
            Accept: 'application/json'
          }
        }
      );
      
      setUsers(response.data.data);
      setPagination(prev => ({
        ...prev,
        users: {
          current_page: response.data.meta?.current_page || 1,
          last_page: response.data.meta?.last_page || 1,
          per_page: response.data.meta?.per_page || 10,
          total: response.data.meta?.total || 0
        }
      }));
    } catch (error: any) {
      console.error('Users fetch error:', error);
      toast.error(
        error.response?.data?.message || 
        "Failed to load users"
      );
    } finally {
      setLoading(prev => ({...prev, users: false}));
    }
  };

  const fetchTransactions = async (page = 1, search = "") => {
    setLoading(prev => ({...prev, transactions: true}));
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/transactions`,
        {
          params: {
            page,
            search: search || undefined,
            per_page: pagination.transactions.per_page
          },
          headers: { 
            Authorization: `Bearer ${authToken}`,
            Accept: 'application/json'
          }
        }
      );
      
      setTransactions(response.data.data);
      setPagination(prev => ({
        ...prev,
        transactions: {
          current_page: response.data.meta?.current_page || 1,
          last_page: response.data.meta?.last_page || 1,
          per_page: response.data.meta?.per_page || 10,
          total: response.data.meta?.total || 0
        }
      }));
    } catch (error: any) {
      console.error('Transactions fetch error:', error);
      toast.error(
        error.response?.data?.message || 
        "Failed to load transactions"
      );
    } finally {
      setLoading(prev => ({...prev, transactions: false}));
    }
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(prev => ({...prev, action: true}));
    
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/books`,
        {
          ...newBook,
          available_copies: newBook.total_copies
        },
        { 
          headers: { 
            Authorization: `Bearer ${authToken}`,
            Accept: 'application/json'
          }
        }
      );
      
      setBooks(prev => [...prev, response.data.data]);
      setShowAddBookModal(false);
      setNewBook({
        title: "",
        author: "",  
        genre: "",
        description: "",
        total_copies: 1,
        publisher: ""
      });
      
      toast.success("Book added successfully");
      fetchDashboardStats();
    } catch (error: any) {
      console.error('Add book error:', error);
      toast.error(
        error.response?.data?.message || 
        "Failed to add book"
      );
    } finally {
      setLoading(prev => ({...prev, action: false}));
    }
  };

  const handleUpdateBook = async (bookId: number, bookData: Partial<Book>) => {
    setLoading(prev => ({...prev, action: true}));
    try {
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/books/${bookId}`,
        bookData,
        { 
          headers: { 
            Authorization: `Bearer ${authToken}`,
            Accept: 'application/json'
          }
        }
      );
      
      toast.success("Book updated successfully");
      fetchBooks();
      fetchDashboardStats();
      setShowEditBookModal(false);
    } catch (error: any) {
      console.error('Update book error:', error);
      toast.error(
        error.response?.data?.message || 
        "Failed to update book"
      );
    } finally {
      setLoading(prev => ({...prev, action: false}));
    }
  };

  const handleDeleteBook = async (bookId: number) => {
    try {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
      });

      if (result.isConfirmed) {
        setLoading(prev => ({...prev, action: true}));
        await axios.delete(
          `${process.env.NEXT_PUBLIC_API_URL}/admin/books/${bookId}`,
          { 
            headers: { 
              Authorization: `Bearer ${authToken}`,
              Accept: 'application/json'
            }
          }
        );
        
        setBooks(prev => prev.filter(book => book.id !== bookId));
        toast.success("Book deleted successfully");
        fetchDashboardStats();
      }
    } catch (error: any) {
      console.error('Delete book error:', error);
      toast.error(
        error.response?.data?.message || 
        "Failed to delete book"
      );
    } finally {
      setLoading(prev => ({...prev, action: false}));
    }
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
      });

      if (result.isConfirmed) {
        setLoading(prev => ({...prev, action: true}));
        await axios.delete(
          `${process.env.NEXT_PUBLIC_API_URL}/admin/users/${userId}`,
          { 
            headers: { 
              Authorization: `Bearer ${authToken}`,
              Accept: 'application/json'
            }
          }
        );
        
        setUsers(prev => prev.filter(user => user.id !== userId));
        toast.success("User deleted successfully");
        fetchDashboardStats();
      }
    } catch (error: any) {
      console.error('Delete user error:', error);
      toast.error(
        error.response?.data?.message || 
        "Failed to delete user"
      );
    } finally {
      setLoading(prev => ({...prev, action: false}));
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
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

  const formatTime = (dateString?: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Time formatting error:', error);
      return "";
    }
  };

  if (isLoading || !authToken || user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50"></div>
      
      {/* Top Navigation Bar */}
      <nav className="bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-2xl bg-gray-700/50 backdrop-blur-sm flex items-center justify-center shadow-lg border border-gray-600">
                <span className="text-white text-xl font-medium">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-semibold text-white">{user?.name}</p>
                <p className="text-xs text-gray-300 bg-gray-700/50 px-2 py-0.5 rounded-full inline-block backdrop-blur-sm">{user?.role}</p>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="flex space-x-4">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 flex items-center ${
                  activeTab === "dashboard"
                    ? "bg-gray-700/50 text-white shadow-lg backdrop-blur-sm"
                    : "text-gray-300 hover:text-white hover:bg-gray-700/30"
                }`}
              >
                <ChartBarIcon className="h-5 w-5 mr-2" />
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab("books")}
                className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 flex items-center ${
                  activeTab === "books"
                    ? "bg-gray-700/50 text-white shadow-lg backdrop-blur-sm"
                    : "text-gray-300 hover:text-white hover:bg-gray-700/30"
                }`}
              >
                <BookIcon className="h-5 w-5 mr-2" />
                Books
              </button>
              <button
                onClick={() => setActiveTab("users")}
                className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 flex items-center ${
                  activeTab === "users"
                    ? "bg-gray-700/50 text-white shadow-lg backdrop-blur-sm"
                    : "text-gray-300 hover:text-white hover:bg-gray-700/30"
                }`}
              >
                <UsersIcon className="h-5 w-5 mr-2" />
                Users
              </button>
              <button
                onClick={() => setActiveTab("transactions")}
                className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 flex items-center ${
                  activeTab === "transactions"
                    ? "bg-gray-700/50 text-white shadow-lg backdrop-blur-sm"
                    : "text-gray-300 hover:text-white hover:bg-gray-700/30"
                }`}
              >
                <ClipboardDocumentListIcon className="h-5 w-5 mr-2" />
                Transactions
              </button>
            </nav>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {activeTab === "dashboard" && "Dashboard"}
                {activeTab === "books" && "Book Management"}
                {activeTab === "users" && "User Management"}
                {activeTab === "transactions" && "Transaction History"}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {activeTab === "dashboard" && "Welcome to your library management system"}
                {activeTab === "books" && "Manage your library's book collection"}
                {activeTab === "users" && "Manage library users and their accounts"}
                {activeTab === "transactions" && "Track book borrowing and returns"}
              </p>
            </div>
            {activeTab === "books" && (
              <button
                onClick={() => setShowAddBookModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-gray-950 transition-all duration-200 shadow-lg hover:shadow-gray-900/20"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Book
              </button>
            )}
          </div>
        </div>

        {/* Dashboard Content */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 rounded-3xl p-8 shadow-xl border border-gray-700/50">
              <div className="max-w-3xl">
                <h2 className="text-3xl font-bold text-white mb-2">
                  Welcome back, {user?.name}!
                </h2>
                <p className="text-gray-300 text-lg">
                  Manage your library system efficiently with these quick actions
                </p>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Manage Books Card */}
              <div 
                onClick={() => setActiveTab("books")}
                className="group relative bg-white rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer transform hover:-translate-y-1 border border-gray-200"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-gray-100 rounded-2xl p-3 group-hover:bg-gray-200 transition-colors duration-200">
                      <BookIcon className="h-8 w-8 text-gray-800" />
                    </div>
                    <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                      Library Core
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Book Collection
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Add new books, update existing ones, and manage your library's collection
                  </p>
                  <div className="flex items-center text-gray-800 font-medium">
                    <span>Manage Books</span>
                    <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Manage Users Card */}
              <div 
                onClick={() => setActiveTab("users")}
                className="group relative bg-white rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer transform hover:-translate-y-1 border border-gray-200"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-gray-100 rounded-2xl p-3 group-hover:bg-gray-200 transition-colors duration-200">
                      <UserPlusIcon className="h-8 w-8 text-gray-800" />
                    </div>
                    <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                      User Management
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    User Accounts
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Handle user registrations, manage permissions, and track user activities
                  </p>
                  <div className="flex items-center text-gray-800 font-medium">
                    <span>Manage Users</span>
                    <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* View Transactions Card */}
              <div 
                onClick={() => setActiveTab("transactions")}
                className="group relative bg-white rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer transform hover:-translate-y-1 border border-gray-200"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-gray-100 rounded-2xl p-3 group-hover:bg-gray-200 transition-colors duration-200">
                      <ClipboardDocumentListIcon className="h-8 w-8 text-gray-800" />
                    </div>
                    <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                      Activity Log
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Transaction History
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Monitor book borrowings, returns, and track overdue items
                  </p>
                  <div className="flex items-center text-gray-800 font-medium">
                    <span>View Transactions</span>
                    <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Books Tab Content */}
        {activeTab === "books" && (
          <>
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Book Management</h3>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                      placeholder="Search books..."
                      value={searchTerm.books}
                      onChange={(e) => {
                        setSearchTerm(prev => ({...prev, books: e.target.value}));
                        fetchBooks(1, e.target.value);
                      }}
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>

                {loading.books ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-600 border-t-gray-400"></div>
                  </div>
                ) : books.length === 0 ? (
                  <div className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-3 rounded-xl relative" role="alert">
                    No books found
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {books.map(book => (
                      <div key={book.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 group">
                        <div className="p-6">
                          <div className="flex flex-col h-full">
                            {/* Book Title and Author */}
                            <div className="mb-4">
                              <h3 className="text-xl font-bold text-gray-900 line-clamp-2 mb-2 group-hover:text-gray-800 transition-colors duration-200">{book.title}</h3>
                            </div>

                            {/* Book Details */}
                            <div className="space-y-2 text-sm mt-4">
                              <div className="flex items-center text-gray-600 bg-gray-50 rounded-xl p-2 group-hover:bg-gray-100 transition-colors duration-200">
                                <DocumentTextIcon className="h-4 w-4 mr-2 text-gray-600" />
                                <span>{book.available_copies} available / {book.total_copies} total</span>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="mt-6 flex space-x-3">
                              <button
                                onClick={() => {
                                  setCurrentBook(book);
                                  setShowEditBookModal(true);
                                }}
                                className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                                disabled={loading.action}
                              >
                                <PencilIcon className="h-4 w-4 mr-2" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteBook(book.id)}
                                className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-gray-950 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 shadow-lg hover:shadow-gray-900/20"
                                disabled={loading.action}
                              >
                                <TrashIcon className="h-4 w-4 mr-2" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {books.length > 0 && (
                  <div className="mt-6 flex justify-center">
                    <nav className="relative z-0 inline-flex rounded-xl shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => fetchBooks(pagination.books.current_page - 1, searchTerm.books)}
                        disabled={pagination.books.current_page === 1}
                        className={`relative inline-flex items-center px-2 py-2 rounded-l-xl border border-gray-300 bg-white text-sm font-medium ${
                          pagination.books.current_page === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        Previous
                      </button>
                      {Array.from({length: pagination.books.last_page}, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => fetchBooks(page, searchTerm.books)}
                          className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${
                            pagination.books.current_page === page
                              ? 'z-10 bg-gray-50 border-gray-500 text-gray-600'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => fetchBooks(pagination.books.current_page + 1, searchTerm.books)}
                        disabled={pagination.books.current_page === pagination.books.last_page}
                        className={`relative inline-flex items-center px-2 py-2 rounded-r-xl border border-gray-300 bg-white text-sm font-medium ${
                          pagination.books.current_page === pagination.books.last_page ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                )}
              </div>
            </div>

            {/* Floating Add Book Button */}
            <button
              type="button"
              onClick={() => setShowAddBookModal(true)}
              className="fixed bottom-8 right-8 z-50 bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800 text-white rounded-full shadow-lg p-4 flex items-center justify-center transition-all duration-200"
              title="Add Book"
            >
              <PlusIcon className="h-6 w-6" />
            </button>
          </>
        )}

        {/* Users Tab Content */}
        {activeTab === "users" && (
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">User Management</h3>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                    placeholder="Search users..."
                    value={searchTerm.users}
                    onChange={(e) => {
                      setSearchTerm(prev => ({...prev, users: e.target.value}));
                      fetchUsers(1, e.target.value);
                    }}
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>

              {loading.users ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-600 border-t-gray-400"></div>
                </div>
              ) : users.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-3 rounded-xl relative" role="alert">
                  No users found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Joined</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map(user => (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors duration-200">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(user.created_at)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              className="text-red-600 hover:text-red-900 transition-colors duration-200"
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={loading.action}
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {users.length > 0 && (
                <div className="mt-4 flex justify-center">
                  <nav className="relative z-0 inline-flex rounded-xl shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => fetchUsers(pagination.users.current_page - 1, searchTerm.users)}
                      disabled={pagination.users.current_page === 1}
                      className={`relative inline-flex items-center px-2 py-2 rounded-l-xl border border-gray-300 bg-white text-sm font-medium ${
                        pagination.users.current_page === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Previous
                    </button>
                    {Array.from({length: pagination.users.last_page}, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => fetchUsers(page, searchTerm.users)}
                        className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${
                          pagination.users.current_page === page
                            ? 'z-10 bg-gray-50 border-gray-500 text-gray-600'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => fetchUsers(pagination.users.current_page + 1, searchTerm.users)}
                      disabled={pagination.users.current_page === pagination.users.last_page}
                      className={`relative inline-flex items-center px-2 py-2 rounded-r-xl border border-gray-300 bg-white text-sm font-medium ${
                        pagination.users.current_page === pagination.users.last_page ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Next
                    </button>
                  </nav>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Transactions Tab Content */}
        {activeTab === "transactions" && (
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Transaction History</h3>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                    placeholder="Search transactions..."
                    value={searchTerm.transactions}
                    onChange={(e) => {
                      setSearchTerm(prev => ({...prev, transactions: e.target.value}));
                      fetchTransactions(1, e.target.value);
                    }}
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>

              {loading.transactions ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-600 border-t-gray-400"></div>
                </div>
              ) : transactions.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-3 rounded-xl relative" role="alert">
                  No transactions found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Book</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Due Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transactions.map(tx => (
                        <tr key={tx.id} className="hover:bg-gray-50 transition-colors duration-200">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{tx.user.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {tx.book.title} by {tx.book.author}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div>{formatDate(tx.due_date)}</div>
                            <div className="text-xs text-gray-400">{formatTime(tx.due_date)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              tx.status === 'returned' 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {tx.status === 'returned' ? (
                                <CheckCircleIcon className="h-4 w-4 mr-1" />
                              ) : (
                                <XCircleIcon className="h-4 w-4 mr-1" />
                              )}
                              {tx.status === 'returned' ? 'Returned' : 'Borrowed'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {transactions.length > 0 && (
                <div className="mt-4 flex justify-center">
                  <nav className="relative z-0 inline-flex rounded-xl shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => fetchTransactions(pagination.transactions.current_page - 1, searchTerm.transactions)}
                      disabled={pagination.transactions.current_page === 1}
                      className={`relative inline-flex items-center px-2 py-2 rounded-l-xl border border-gray-300 bg-white text-sm font-medium ${
                        pagination.transactions.current_page === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Previous
                    </button>
                    {Array.from({length: pagination.transactions.last_page}, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => fetchTransactions(page, searchTerm.transactions)}
                        className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${
                          pagination.transactions.current_page === page
                            ? 'z-10 bg-gray-50 border-gray-500 text-gray-600'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => fetchTransactions(pagination.transactions.current_page + 1, searchTerm.transactions)}
                      disabled={pagination.transactions.current_page === pagination.transactions.last_page}
                      className={`relative inline-flex items-center px-2 py-2 rounded-r-xl border border-gray-300 bg-white text-sm font-medium ${
                        pagination.transactions.current_page === pagination.transactions.last_page ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Next
                    </button>
                  </nav>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Book Modal */}
      {showAddBookModal && (
        <div className="fixed inset-0 bg-gray-500/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add New Book</h3>
              <button
                onClick={() => setShowAddBookModal(false)}
                className="text-gray-400 hover:text-gray-500 transition-colors duration-200"
              >
                <span className="sr-only">Close</span>
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleAddBook}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    required
                    className="mt-1 block w-full rounded-xl border-gray-200 shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                    value={newBook.title}
                    onChange={(e) => setNewBook(prev => ({...prev, title: e.target.value}))}
                  />
                </div>
                <div>
                  <label htmlFor="author" className="block text-sm font-medium text-gray-700">Author</label>
                  <input
                    type="text"
                    id="author"
                    name="author"
                    required
                    className="mt-1 block w-full rounded-xl border-gray-200 shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                    value={newBook.author}
                    onChange={(e) => setNewBook(prev => ({...prev, author: e.target.value}))}
                  />
                </div>
                <div>
                  <label htmlFor="genre" className="block text-sm font-medium text-gray-700">Genre</label>
                  <input
                    type="text"
                    id="genre"
                    name="genre"
                    required
                    className="mt-1 block w-full rounded-xl border-gray-200 shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                    value={newBook.genre}
                    onChange={(e) => setNewBook(prev => ({...prev, genre: e.target.value}))}
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    required
                    className="mt-1 block w-full rounded-xl border-gray-200 shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                    value={newBook.description}
                    onChange={(e) => setNewBook(prev => ({...prev, description: e.target.value}))}
                  />
                </div>
                <div>
                  <label htmlFor="total_copies" className="block text-sm font-medium text-gray-700">Total Copies</label>
                  <input
                    type="number"
                    id="total_copies"
                    name="total_copies"
                    min="1"
                    required
                    className="mt-1 block w-full rounded-xl border-gray-200 shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                    value={newBook.total_copies}
                    onChange={(e) => setNewBook(prev => ({...prev, total_copies: parseInt(e.target.value)}))}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddBookModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading.action}
                  className="px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-gray-950 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                >
                  {loading.action ? (
                    <div className="flex items-center">
                      <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      Adding...
                    </div>
                  ) : (
                    'Add Book'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Book Modal */}
      {showEditBookModal && currentBook && (
        <div className="fixed inset-0 bg-gray-500/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Book</h3>
              <button
                onClick={() => {
                  setShowEditBookModal(false);
                  setCurrentBook(null);
                }}
                className="text-gray-400 hover:text-gray-500 transition-colors duration-200"
              >
                <span className="sr-only">Close</span>
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleUpdateBook(currentBook.id, {
                title: currentBook.title,
                author: currentBook.author,
                genre: currentBook.genre,
                description: currentBook.description,
                total_copies: currentBook.total_copies,
                publisher: currentBook.publisher
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700">Title</label>
                  <input
                    type="text"
                    id="edit-title"
                    name="title"
                    required
                    className="mt-1 block w-full rounded-xl border-gray-200 shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                    value={currentBook.title}
                    onChange={(e) => setCurrentBook(prev => prev ? {...prev, title: e.target.value} : null)}
                  />
                </div>
                <div>
                  <label htmlFor="edit-author" className="block text-sm font-medium text-gray-700">Author</label>
                  <input
                    type="text"
                    id="edit-author"
                    name="author"
                    required
                    className="mt-1 block w-full rounded-xl border-gray-200 shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                    value={currentBook.author}
                    onChange={(e) => setCurrentBook(prev => prev ? {...prev, author: e.target.value} : null)}
                  />
                </div>
                <div>
                  <label htmlFor="edit-genre" className="block text-sm font-medium text-gray-700">Genre</label>
                  <input
                    type="text"
                    id="edit-genre"
                    name="genre"
                    required
                    className="mt-1 block w-full rounded-xl border-gray-200 shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                    value={currentBook.genre}
                    onChange={(e) => setCurrentBook(prev => prev ? {...prev, genre: e.target.value} : null)}
                  />
                </div>
                <div>
                  <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    id="edit-description"
                    name="description"
                    rows={3}
                    required
                    className="mt-1 block w-full rounded-xl border-gray-200 shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                    value={currentBook.description}
                    onChange={(e) => setCurrentBook(prev => prev ? {...prev, description: e.target.value} : null)}
                  />
                </div>
                <div>
                  <label htmlFor="edit-total-copies" className="block text-sm font-medium text-gray-700">Total Copies</label>
                  <input
                    type="number"
                    id="edit-total-copies"
                    name="total_copies"
                    min="1"
                    required
                    className="mt-1 block w-full rounded-xl border-gray-200 shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                    value={currentBook.total_copies}
                    onChange={(e) => setCurrentBook(prev => prev ? {...prev, total_copies: parseInt(e.target.value)} : null)}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditBookModal(false);
                    setCurrentBook(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading.action}
                  className="px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-gray-950 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                >
                  {loading.action ? (
                    <div className="flex items-center">
                      <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      Updating...
                    </div>
                  ) : (
                    'Update Book'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

export default AdminDashboard;