# NurAI-Revival Design Guidelines

## Brand Identity

**Purpose**: NurAI is an AI companion app focused on thoughtful, supportive conversations. It helps users explore ideas, get guidance, and engage with AI in a calming, trusted environment.

**Aesthetic Direction**: **Soft/Organic** with editorial touches - gentle curves, breathing room, sophisticated typography. Think "trusted friend" not "corporate chatbot."

**Memorable Element**: Conversations feel like reading a curated journal - generous whitespace, elegant message bubbles with subtle depth, and a signature warm gradient that shifts throughout the day.

## Navigation Architecture

**Root Navigation**: Drawer + Stack

- **Main Chat Screen** (default) - Active conversation with AI
- **Drawer Menu**:
  - Conversation History (past chats, organized by date)
  - Settings
  - About

**Screen List**:
1. Chat Screen - Main AI conversation interface
2. History Screen - Browse/search past conversations
3. Settings Screen - Preferences, appearance, account
4. About Screen - App info, privacy, terms

## Screen-by-Screen Specifications

### 1. Chat Screen
**Purpose**: Primary AI conversation interface

**Layout**:
- Header: Transparent, with drawer button (left), "New Chat" button (right)
- Main content: Scrollable message list (inverted, newest at bottom)
- Input area: Fixed at bottom with text input + send button
- Safe area: top inset = headerHeight + Spacing.xl, bottom inset = insets.bottom + Spacing.md

**Components**:
- Message bubbles (AI messages align left, user messages align right)
- Timestamp labels (subtle, grouped by time)
- Typing indicator animation when AI is responding
- Empty state: Welcoming illustration with suggested prompts

### 2. History Screen
**Purpose**: Access past conversations

**Layout**:
- Header: Default with title "Conversations", search button (right)
- Main content: Scrollable list of conversation cards
- Safe area: top inset = Spacing.xl, bottom inset = insets.bottom + Spacing.xl

**Components**:
- Conversation cards showing: title, preview, date
- Swipe actions: Delete (red)
- Empty state: Illustration with "Start your first conversation"

### 3. Settings Screen
**Purpose**: App preferences and account management

**Layout**:
- Header: Default with title "Settings"
- Main content: Scrollable form with sections
- Safe area: top inset = Spacing.xl, bottom inset = insets.bottom + Spacing.xl

**Components**:
- Profile section: Avatar, display name
- Appearance: Theme toggle (Light/Dark/Auto)
- Notifications toggle
- Account: Sign out button (nested), Delete account (nested with double confirmation)

### 4. About Screen
**Purpose**: App information

**Layout**:
- Header: Default with title "About"
- Main content: Scrollable centered content
- Safe area: top inset = Spacing.xl, bottom inset = insets.bottom + Spacing.xl

**Components**:
- App icon and version
- Description text
- Links: Privacy Policy, Terms of Service

## Color Palette

**Primary**: #6B8E7F (Sage green - calm, trustworthy)
**Secondary**: #D4A574 (Warm gold - friendly accent)
**Background**: #FAFAF8 (Warm off-white)
**Surface**: #FFFFFF (Pure white for cards)
**Text Primary**: #2C3E3B (Deep forest)
**Text Secondary**: #6B7978 (Muted gray)
**AI Bubble**: #F0F4F2 (Soft mint)
**User Bubble**: #6B8E7F (Primary)
**Border**: #E8EBE9 (Subtle divider)
**Error**: #C97064 (Muted red)

## Typography

**Font**: Google Font "Inter" for all text (clean, legible, modern)

**Type Scale**:
- Title: 28pt, Bold (Screen headers)
- Heading: 20pt, Semibold (Section titles)
- Body: 16pt, Regular (Messages, body text)
- Caption: 14pt, Regular (Timestamps, labels)
- Small: 12pt, Regular (Metadata)

## Assets to Generate

1. **icon.png** - App icon featuring abstract leaf/chat bubble hybrid in sage green
   - WHERE USED: Device home screen

2. **splash-icon.png** - Simplified version of app icon
   - WHERE USED: App launch screen

3. **empty-chat.png** - Serene illustration of person with thought bubbles, soft sage/gold palette
   - WHERE USED: Chat screen before first message

4. **empty-history.png** - Minimalist open journal with gentle pages, warm tones
   - WHERE USED: History screen when no conversations exist

5. **avatar-default.png** - Soft geometric avatar with gradient (sage to gold)
   - WHERE USED: Settings screen profile section

## Visual Design Notes

- Message bubbles: 12pt border radius, AI bubbles have subtle shadow (shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.06, shadowRadius: 2)
- Input field: Rounded container with 16pt radius, light border
- Send button: Circular (40pt diameter), primary color, white icon, subtle shadow
- All touchable elements: 0.7 opacity on press
- Card elements: 8pt border radius, subtle border, no shadow
- Generous padding throughout (24pt margins, 16pt internal spacing)