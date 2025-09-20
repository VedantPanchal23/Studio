import React from 'react';
import {
    Files,
    Search,
    GitBranch,
    Play,
    Package,
    Settings,
    User
} from 'lucide-react';
import './ActivityBar.css';

const ActivityBar = ({ activeView, onViewChange }) => {
    const activities = [
        { id: 'explorer', icon: Files, label: 'Explorer' },
        { id: 'search', icon: Search, label: 'Search' },
        { id: 'source-control', icon: GitBranch, label: 'Source Control' },
        { id: 'run', icon: Play, label: 'Run and Debug' },
        { id: 'extensions', icon: Package, label: 'Extensions' }
    ];

    const bottomActivities = [
        { id: 'account', icon: User, label: 'Account' },
        { id: 'settings', icon: Settings, label: 'Settings' }
    ];

    return (
        <div className="activity-bar">
            <div className="activity-bar__top">
                {activities.map((activity) => (
                    <button
                        key={activity.id}
                        className={`activity-bar__item ${activeView === activity.id ? 'activity-bar__item--active' : ''
                            }`}
                        onClick={() => onViewChange(activity.id)}
                        title={activity.label}
                        aria-label={activity.label}
                    >
                        <activity.icon size={24} />
                    </button>
                ))}
            </div>

            <div className="activity-bar__bottom">
                {bottomActivities.map((activity) => (
                    <button
                        key={activity.id}
                        className={`activity-bar__item ${activeView === activity.id ? 'activity-bar__item--active' : ''
                            }`}
                        onClick={() => onViewChange(activity.id)}
                        title={activity.label}
                        aria-label={activity.label}
                    >
                        <activity.icon size={24} />
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ActivityBar;