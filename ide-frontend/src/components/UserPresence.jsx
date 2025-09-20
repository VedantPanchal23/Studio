import React from 'react'
import styles from './UserPresence.module.css'

/**
 * Component to display user presence indicators
 */
const UserPresence = ({ users, currentUserId, maxVisible = 5 }) => {
  // Filter out current user and get active users
  const activeUsers = users.filter(user => 
    user.user && user.user.id !== currentUserId
  )

  const visibleUsers = activeUsers.slice(0, maxVisible)
  const hiddenCount = Math.max(0, activeUsers.length - maxVisible)

  if (activeUsers.length === 0) {
    return null
  }

  return (
    <div className={styles.container}>
      {/* User avatars */}
      <div className={styles.avatarList}>
        {visibleUsers.map((userState) => {
          const user = userState.user
          const color = user.color || '#007ACC'
          
          return (
            <div
              key={user.id}
              className={styles.userAvatar}
              title={`${user.name} (${user.email})`}
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className={styles.avatar}
                  style={{ borderColor: color }}
                />
              ) : (
                <div
                  className={styles.avatarFallback}
                  style={{ 
                    backgroundColor: color,
                    borderColor: color 
                  }}
                >
                  {user.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
              
              {/* Tooltip */}
              <div className={styles.tooltip}>
                {user.name}
                <div className={styles.tooltipEmail}>{user.email}</div>
                <div className={styles.tooltipArrow}></div>
              </div>
            </div>
          )
        })}
        
        {/* Show count of hidden users */}
        {hiddenCount > 0 && (
          <div
            className={styles.moreCounter}
            title={`${hiddenCount} more user${hiddenCount > 1 ? 's' : ''}`}
          >
            +{hiddenCount}
          </div>
        )}
      </div>
      
      {/* User count text */}
      <span className={styles.userCount}>
        {activeUsers.length} user{activeUsers.length !== 1 ? 's' : ''} online
      </span>
    </div>
  )
}

export default UserPresence