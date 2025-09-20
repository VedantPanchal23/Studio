import React from 'react'

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
    <div className="flex items-center gap-1">
      {/* User avatars */}
      <div className="flex -space-x-2">
        {visibleUsers.map((userState) => {
          const user = userState.user
          const color = user.color || '#007ACC'
          
          return (
            <div
              key={user.id}
              className="relative group"
              title={`${user.name} (${user.email})`}
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                  style={{ borderColor: color }}
                />
              ) : (
                <div
                  className="w-6 h-6 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-xs font-medium text-white"
                  style={{ 
                    backgroundColor: color,
                    borderColor: color 
                  }}
                >
                  {user.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
              
              {/* Tooltip */}
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                {user.name}
                <div className="text-gray-300 text-xs">{user.email}</div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          )
        })}
        
        {/* Show count of hidden users */}
        {hiddenCount > 0 && (
          <div
            className="w-6 h-6 rounded-full bg-gray-500 border-2 border-white shadow-sm flex items-center justify-center text-xs font-medium text-white"
            title={`${hiddenCount} more user${hiddenCount > 1 ? 's' : ''}`}
          >
            +{hiddenCount}
          </div>
        )}
      </div>
      
      {/* User count text */}
      <span className="text-xs text-gray-500 ml-1">
        {activeUsers.length} user{activeUsers.length !== 1 ? 's' : ''} online
      </span>
    </div>
  )
}

export default UserPresence