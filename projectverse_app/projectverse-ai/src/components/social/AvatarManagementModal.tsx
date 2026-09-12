import React, { useState, useRef } from "react";
import { User } from "../../types";
import { DEFAULT_AVATAR_PRESETS, getDefaultAvatarUrl } from "../../utils/avatarUtils";
import { saveUserToFirestore } from "../../lib/firebase";
import UserAvatar from "./UserAvatar";
import { Upload, Check, Trash2, X, Image as ImageIcon, Sparkles, Loader2 } from "lucide-react";

interface AvatarManagementModalProps {
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onUpdateUser: (updatedUser: User) => void;
}

export default function AvatarManagementModal({
  currentUser,
  isOpen,
  onClose,
  onUpdateUser
}: AvatarManagementModalProps) {
  const [activeTab, setActiveTab] = useState<"preset" | "upload">("preset");
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string>(
    currentUser.avatarUrl || getDefaultAvatarUrl(currentUser.id)
  );
  const [previewUploadUrl, setPreviewUploadUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle local image file selection & Base64 encoding
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);

    // Validate image format
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrorMessage("Please select a valid image file (JPG, PNG, or WEBP).");
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Image size must be less than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      setPreviewUploadUrl(base64Url);
      setSelectedAvatarUrl(base64Url);
    };
    reader.readAsDataURL(file);
  };

  // Save selected avatar / uploaded image
  const handleSave = async (urlToSave: string) => {
    if (!currentUser || !currentUser.id) return;
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const updatedUser: User = {
        ...currentUser,
        avatarUrl: urlToSave
      };

      await saveUserToFirestore(updatedUser);
      onUpdateUser(updatedUser);
      setIsSaving(false);
      onClose();
    } catch (err) {
      console.error("Error saving avatarUrl:", err);
      setErrorMessage("Failed to update profile photo. Please try again.");
      setIsSaving(false);
    }
  };

  // Remove photo - reset to default
  const handleRemovePhoto = async () => {
    const defaultUrl = getDefaultAvatarUrl(currentUser.id);
    setSelectedAvatarUrl(defaultUrl);
    setPreviewUploadUrl(null);
    await handleSave(defaultUrl);
  };

  const hasCustomPhoto = !!(currentUser.avatarUrl && !currentUser.avatarUrl.includes("dicebear.com"));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/40">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-500" />
            <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Change Profile Photo
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">

          {/* Current Avatar Preview */}
          <div className="flex flex-col items-center justify-center space-y-3">
            <UserAvatar
              userId={currentUser.id}
              avatarUrl={selectedAvatarUrl}
              name={currentUser.name}
              size="2xl"
              showBorder={true}
            />
            <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
              @{currentUser.name.toLowerCase().replace(/\s+/g, "_")}
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold text-center border border-rose-200 dark:border-rose-900">
              {errorMessage}
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex rounded-xl bg-zinc-100 dark:bg-zinc-800/60 p-1">
            <button
              onClick={() => setActiveTab("preset")}
              className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition-all ${
                activeTab === "preset"
                  ? "bg-white dark:bg-zinc-900 text-violet-600 dark:text-violet-400 shadow-2xs"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              Choose Avatar Preset
            </button>
            <button
              onClick={() => setActiveTab("upload")}
              className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition-all ${
                activeTab === "upload"
                  ? "bg-white dark:bg-zinc-900 text-violet-600 dark:text-violet-400 shadow-2xs"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              Upload Custom Photo
            </button>
          </div>

          {/* Tab 1: Default Avatar Grid */}
          {activeTab === "preset" && (
            <div className="space-y-3">
              <label className="text-[11px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Select an Avatar
              </label>
              <div className="grid grid-cols-5 gap-3 max-h-48 overflow-y-auto p-1 scrollbar-thin">
                {DEFAULT_AVATAR_PRESETS.map((preset) => {
                  const isSelected = selectedAvatarUrl === preset.url;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => setSelectedAvatarUrl(preset.url)}
                      className={`relative rounded-full p-1 transition-transform hover:scale-105 cursor-pointer ${
                        isSelected 
                          ? "ring-2 ring-violet-600 dark:ring-violet-400 scale-105" 
                          : "opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="w-12 h-12 rounded-full object-cover bg-zinc-100 dark:bg-zinc-800"
                      />
                      {isSelected && (
                        <div className="absolute -bottom-1 -right-1 bg-violet-600 text-white p-0.5 rounded-full shadow-xs">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 2: Custom File Upload */}
          {activeTab === "upload" && (
            <div className="space-y-4 text-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="p-6 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-violet-500 dark:hover:border-violet-400 transition-colors cursor-pointer bg-zinc-50/50 dark:bg-zinc-950/40 space-y-2"
              >
                <Upload className="w-8 h-8 text-violet-500 mx-auto" />
                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Click to select photo from device
                </p>
                <p className="text-[10px] text-zinc-400">
                  Supports JPG, PNG, or WEBP (Max 5MB)
                </p>
              </div>
            </div>
          )}

          {/* Quick Actions Footer */}
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => handleSave(selectedAvatarUrl)}
              disabled={isSaving}
              className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Avatar...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Apply Profile Photo</span>
                </>
              )}
            </button>

            {hasCustomPhoto && (
              <button
                onClick={handleRemovePhoto}
                disabled={isSaving}
                className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-extrabold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Custom Photo</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
