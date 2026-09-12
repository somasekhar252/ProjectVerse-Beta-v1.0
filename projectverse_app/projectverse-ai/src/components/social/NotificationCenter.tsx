import React, { useState, useEffect } from "react";
import { 
  Bell, 
  X, 
  Heart, 
  UserPlus, 
  MessageSquare, 
  CheckCheck, 
  ChevronRight,
  Sparkles
} from "lucide-react";
import { User, AppNotification } from "../../types";
import { 
  subscribeToUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead 
} from "../../lib/socialService";

interface NotificationCenterProps {
  currentUser: User | null;
  notifications?: AppNotification[];
  isOpen: boolean;
  onClose: () => void;
  onNavigateTarget: (targetType: string, targetId?: string) => void;
}

export default function NotificationCenter({
  currentUser,
  notifications: propNotifications,
  isOpen,
  onClose,
  onNavigateTarget
}: NotificationCenterProps) {
  const [localNotifications, setLocalNotifications] = useState<AppNotification[]>([]);
  const notifications = propNotifications !== undefined ? propNotifications : localNotifications;

  // Subscribe to real-time notifications from Firestore if not passed as prop
  useEffect(() => {
    if (propNotifications !== undefined) return;
    if (!currentUser || !currentUser.id) {
      setLocalNotifications([]);
      return;
    }
    const unsubscribe = subscribeToUserNotifications(currentUser.id, (notifs) => {
      setLocalNotifications(notifs);
    });
    return () => unsubscribe();
  }, [currentUser, propNotifications]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.read) {
      await markNotificationAsRead(notif.id);
    }
    onClose();

    // Navigate to target resource based on notification type
    if (notif.type === "follow") {
      onNavigateTarget("user", notif.actorId);
    } else if (notif.type === "project_like" || notif.type === "project_comment") {
      if (notif.targetId) {
        onNavigateTarget("project", notif.targetId);
      }
    } else if (notif.type === "reel_like" || notif.type === "reel_comment") {
      if (notif.targetId) {
        onNavigateTarget("reel", notif.targetId);
      }
    } else if (notif.type === "message_request" || notif.type === "message") {
      onNavigateTarget("user", notif.actorId);
    }
  };

  const getNotificationIcon = (type: AppNotification["type"]) => {
    switch (type) {
      case "follow":
        return <UserPlus className="w-4 h-4 text-violet-500 shrink-0" />;
      case "project_like":
      case "reel_like":
        return <Heart className="w-4 h-4 text-rose-500 fill-rose-500 shrink-0" />;
      case "project_comment":
      case "reel_comment":
        return <MessageSquare className="w-4 h-4 text-sky-500 shrink-0" />;
      case "message_request":
        return <MessageSquare className="w-4 h-4 text-amber-500 shrink-0" />;
      case "message":
        return <MessageSquare className="w-4 h-4 text-violet-500 shrink-0" />;
      default:
        return <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />;
    }
  };

  const formatTimestamp = (dateStr: string) => {
    if (!dateStr) return "Just now";
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm h-full bg-white dark:bg-[#0c0c12] border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-250"
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-150 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/40">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">
                Notifications
              </h3>
              <p className="text-[10px] text-zinc-400 font-semibold">
                {unreadCount > 0 ? `${unreadCount} unread update${unreadCount > 1 ? "s" : ""}` : "All notifications read"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                onClick={() => currentUser && markAllNotificationsAsRead(currentUser.id)}
                className="p-1.5 text-zinc-400 hover:text-violet-600 dark:hover:text-violet-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/50">
          {notifications.length > 0 ? (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer relative group hover:bg-violet-500/5 dark:hover:bg-violet-500/10 ${
                  !notif.read ? "bg-violet-50/50 dark:bg-violet-950/20" : ""
                }`}
              >
                {/* Unread indicator dot */}
                {!notif.read && (
                  <span className="absolute top-4 left-2 w-2 h-2 bg-violet-600 rounded-full" />
                )}

                {/* Actor Avatar */}
                <div className="relative shrink-0 ml-1">
                  <img
                    src={notif.actorAvatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${notif.actorId}`}
                    alt={notif.actorName}
                    className="w-9 h-9 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                  />
                  <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    {getNotificationIcon(notif.type)}
                  </div>
                </div>

                {/* Notification Details */}
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-snug">
                    <span className="font-extrabold text-zinc-900 dark:text-white">
                      {notif.actorName}
                    </span>{" "}
                    {notif.text}
                  </p>
                  <span className="text-[10px] text-zinc-400 font-semibold mt-1 block">
                    {formatTimestamp(notif.createdAt)}
                  </span>
                </div>

                <ChevronRight className="w-4 h-4 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity self-center" />
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-zinc-400 dark:text-zinc-500 space-y-3">
              <Bell className="w-10 h-10 mx-auto opacity-30 text-zinc-400" />
              <p className="text-xs font-black uppercase tracking-widest">No notifications yet</p>
              <p className="text-[10px] text-zinc-400/80 max-w-xs mx-auto">
                When other students follow you, or like/comment on your projects and reels, you will see notifications here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
