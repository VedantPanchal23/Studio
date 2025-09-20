import { useState } from 'react'
import { ChevronDown, User, Settings, LogOut } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { WorkspaceSelector } from '../WorkspaceManager'
import styles from './Header.module.css'

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
    <header className={styles.header}>
      {/* Left side - Logo and Workspace */}
      <div className={styles.leftSection}>
        <div className={styles.brand}>
          <div className={styles.logo}>
            <span className={styles.logoText}>IDE</span>
          </div>
          <span className={styles.brandName}>Browser IDE</span>
        </div>
        
        {/* Workspace Selector */}
        <WorkspaceSelector onWorkspaceChange={handleWorkspaceChange} />
      </div>

      {/* Right side - User Menu */}
      <div className={styles.userMenu}>
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className={styles.userButton}
        >
          <User className={styles.userIcon} />
          <span className={styles.userName}>{user?.name || 'User'}</span>
          <ChevronDown className={styles.chevronIcon} />
        </button>
        
        {userMenuOpen && (
          <div className={styles.dropdown}>
            <div className={styles.dropdownContent}>
              <button className={styles.menuItem}>
                <Settings className={styles.menuIcon} />
                <span>Settings</span>
              </button>
              <button 
                onClick={handleLogout}
                className={styles.menuItem}
              >
                <LogOut className={styles.menuIcon} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}