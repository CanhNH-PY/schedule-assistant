interface IconProps { size?: number; className?: string; strokeWidth?: number }
const I = ({ size = 18, className = '', sw = 2, d }: { size?: number; className?: string; sw?: number; d: string }) => (
  <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)
const S = ({ size = 18, className = '', sw = 2, children }: { size?: number; className?: string; sw?: number; children: React.ReactNode }) => (
  <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

import React from 'react'

export const IconBriefcase = ({ size = 18, className = '' }: IconProps) => (
  <S size={size} className={className}>
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </S>
)

export const IconBook = ({ size = 18, className = '' }: IconProps) => (
  <S size={size} className={className}>
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </S>
)

export const IconSunset = ({ size = 18, className = '' }: IconProps) => (
  <S size={size} className={className}>
    <path d="M17 18a5 5 0 0 0-10 0" />
    <line x1="12" y1="9" x2="12" y2="2" />
    <line x1="4.22" y1="10.22" x2="5.64" y2="11.64" />
    <line x1="1" y1="18" x2="3" y2="18" />
    <line x1="21" y1="18" x2="23" y2="18" />
    <line x1="18.36" y1="11.64" x2="19.78" y2="10.22" />
    <line x1="23" y1="22" x2="1" y2="22" />
    <polyline points="16 5 12 9 8 5" />
  </S>
)

export const IconBarChart = ({ size = 18, className = '' }: IconProps) => (
  <S size={size} className={className}>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
    <line x1="2" y1="20" x2="22" y2="20" />
  </S>
)

export const IconSettings = ({ size = 18, className = '' }: IconProps) => (
  <S size={size} className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </S>
)

export const IconCheck = ({ size = 18, className = '' }: IconProps) => (
  <I size={size} className={className} d="M20 6L9 17l-5-5" />
)

export const IconCheckCircle = ({ size = 18, className = '' }: IconProps) => (
  <S size={size} className={className}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </S>
)

export const IconClock = ({ size = 18, className = '' }: IconProps) => (
  <S size={size} className={className}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </S>
)

export const IconCalendar = ({ size = 18, className = '' }: IconProps) => (
  <S size={size} className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </S>
)

export const IconTrophy = ({ size = 18, className = '' }: IconProps) => (
  <S size={size} className={className}>
    <polyline points="8 21 12 17 16 21" />
    <line x1="12" y1="17" x2="12" y2="11" />
    <path d="M7 4h10l1 7a5 5 0 0 1-12 0z" />
    <line x1="5" y1="4" x2="2" y2="4" />
    <line x1="19" y1="4" x2="22" y2="4" />
  </S>
)

export const IconTarget = ({ size = 18, className = '' }: IconProps) => (
  <S size={size} className={className}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </S>
)

export const IconPlus = ({ size = 18, className = '' }: IconProps) => (
  <S size={size} className={className}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </S>
)

export const IconX = ({ size = 18, className = '' }: IconProps) => (
  <S size={size} className={className}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </S>
)

export const IconChevronDown = ({ size = 18, className = '' }: IconProps) => (
  <I size={size} className={className} d="M6 9l6 6 6-6" />
)

export const IconChevronUp = ({ size = 18, className = '' }: IconProps) => (
  <I size={size} className={className} d="M18 15l-6-6-6 6" />
)

export const IconChevronLeft = ({ size = 18, className = '' }: IconProps) => (
  <I size={size} className={className} d="M15 18l-6-6 6-6" />
)

export const IconChevronRight = ({ size = 18, className = '' }: IconProps) => (
  <I size={size} className={className} d="M9 18l6-6-6-6" />
)

export const IconRefresh = ({ size = 18, className = '' }: IconProps) => (
  <S size={size} className={className}>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </S>
)

export const IconMail = ({ size = 18, className = '' }: IconProps) => (
  <S size={size} className={className}>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </S>
)

export const IconBell = ({ size = 18, className = '' }: IconProps) => (
  <S size={size} className={className}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </S>
)

export const IconFlag = ({ size = 18, className = '' }: IconProps) => (
  <S size={size} className={className}>
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </S>
)

export const IconActivity = ({ size = 18, className = '' }: IconProps) => (
  <I size={size} className={className} d="M22 12h-4l-3 9L9 3l-3 9H2" />
)

export const IconTimer = ({ size = 18, className = '' }: IconProps) => (
  <S size={size} className={className}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </S>
)

export const IconCloud = ({ size = 18, className = '' }: IconProps) => (
  <S size={size} className={className}>
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
  </S>
)

export const IconInfo = ({ size = 18, className = '' }: IconProps) => (
  <S size={size} className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </S>
)

export const IconEdit = ({ size = 18, className = '' }: IconProps) => (
  <S size={size} className={className}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </S>
)

export const IconLayers = ({ size = 18, className = '' }: IconProps) => (
  <S size={size} className={className}>
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </S>
)
