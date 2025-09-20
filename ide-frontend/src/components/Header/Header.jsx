import { useState } from 'react'
import { ChevronDown, User, Settings, LogOut } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { WorkspaceSelector } from '../WorkspaceManager'

export function Header() {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    setUserMenuOpen(false)
  }

  const handleWorkspaceChange = (workspace) => {
    // Handle workspace change if needed
    console.log('Workspace changed to:', workspace)
  }

  return (
    <header className="h-12 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4">
      {/* Left side - Logo and Workspace */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
            <span className="text-white text-sm font-bold">IDE</span>
          </div>
          <span className="text-slate-200 font-medium">Browser IDE</span>
        </div>
        
        {/* Workspace Selector */}
        <WorkspaceSelector onWorkspaceChange={handleWorkspaceChange} />
      </div>

      {/* Right side - User Menu */}
      <div className="relative">
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="flex items-center space-x-2 px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 transition-colors"
        >
          <User className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-200">{user?.name || 'User'}</span>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </button>
        
        {userMenuOpen && (
          <div className="absolute top-full right-0 mt-1 w-48 bg-slate-800 border border-slate-600 rounded shadow-lg z-50">
            <div className="py-1">
              <button className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </button>
              <button 
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}