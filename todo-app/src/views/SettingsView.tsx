import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { apiUpdateProfile, setToken } from '../api'
import type { AuthUser } from '../api'
import { useTracker } from '../tracker'
import { todayKey } from '../date'

interface Props {
  onUserUpdate: (u: AuthUser) => void
  onLogout: () => void
}

export default function SettingsView({ onUserUpdate, onLogout }: Props) {
  const { user, days, replaceDays, clearAllDays } = useTracker()

  const [name, setName] = useState(user.name ?? '')
  const [profileBusy, setProfileBusy] = useState(false)
  const [profileMsg, setProfileMsg] = useState<string | null>(null)
  const [profileErr, setProfileErr] = useState<string | null>(null)

  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [pwMsg, setPwMsg] = useState<string | null>(null)
  const [pwErr, setPwErr] = useState<string | null>(null)

  const [wipeBusy, setWipeBusy] = useState(false)
  const [wipeConfirm, setWipeConfirm] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  async function saveProfile(e: FormEvent) {
    e.preventDefault()
    setProfileMsg(null)
    setProfileErr(null)
    setProfileBusy(true)
    try {
      const { user: u } = await apiUpdateProfile({ name })
      onUserUpdate(u)
      setProfileMsg('Saved.')
    } catch (err) {
      setProfileErr(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setProfileBusy(false)
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault()
    setPwMsg(null)
    setPwErr(null)
    if (newPw !== confirmPw) {
      setPwErr('New passwords do not match')
      return
    }
    setPwBusy(true)
    try {
      await apiUpdateProfile({ currentPassword: curPw, newPassword: newPw })
      setCurPw('')
      setNewPw('')
      setConfirmPw('')
      setPwMsg('Password updated.')
    } catch (err) {
      setPwErr(err instanceof Error ? err.message : 'Could not update password')
    } finally {
      setPwBusy(false)
    }
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(days, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `epoch-export-${todayKey()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function importData(file: File) {
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Invalid export file')
      }
      replaceDays(parsed as Record<string, never>)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not import file')
    }
  }

  async function wipe() {
    setWipeBusy(true)
    try {
      await clearAllDays()
      setWipeConfirm(false)
    } finally {
      setWipeBusy(false)
    }
  }

  function signOut() {
    setToken(null)
    onLogout()
  }

  return (
    <>
      <header className="masthead">
        <div>
          <p className="kicker">
            EPOCH <span aria-hidden="true">·</span> settings
          </p>
          <h1>
            <em>Settings</em>
          </h1>
          <p className="subline">{user.email}</p>
        </div>
      </header>

      <div className="settings-blocks">
        <section className="block">
          <header className="block-head">
            <h2>Profile</h2>
          </header>
          <form className="settings-form" onSubmit={saveProfile}>
            <div className="field">
              <label className="field-label" htmlFor="settings-name">
                Name
              </label>
              <input
                id="settings-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
              />
            </div>
            <div className="settings-row">
              <button type="submit" className="add-btn small" disabled={profileBusy}>
                {profileBusy ? 'Saving…' : 'Save'}
              </button>
              {profileMsg && <span className="form-ok">{profileMsg}</span>}
              {profileErr && <span className="form-err">{profileErr}</span>}
            </div>
          </form>
        </section>

        <section className="block">
          <header className="block-head">
            <h2>Change password</h2>
          </header>
          <form className="settings-form" onSubmit={changePassword}>
            <div className="field">
              <label className="field-label" htmlFor="settings-cur">
                Current password
              </label>
              <input id="settings-cur" type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} autoComplete="current-password" required />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="settings-new">
                New password
              </label>
              <input id="settings-new" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" required />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="settings-confirm">
                Confirm new password
              </label>
              <input id="settings-confirm" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} autoComplete="new-password" required />
            </div>
            <div className="settings-row">
              <button type="submit" className="add-btn small" disabled={pwBusy}>
                {pwBusy ? 'Updating…' : 'Update password'}
              </button>
              {pwMsg && <span className="form-ok">{pwMsg}</span>}
              {pwErr && <span className="form-err">{pwErr}</span>}
            </div>
          </form>
        </section>

        <section className="block">
          <header className="block-head">
            <h2>Your data</h2>
          </header>
          <p className="settings-help">
            Your log is stored securely in the cloud and synced across devices. Export a copy any time,
            or import one to restore it.
          </p>
          <div className="settings-row">
            <button type="button" className="nav-btn" onClick={exportData}>
              Export as JSON
            </button>
            <button type="button" className="nav-btn" onClick={() => fileRef.current?.click()}>
              Import JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void importData(f)
                e.target.value = ''
              }}
            />
          </div>
        </section>

        <section className="block danger-zone">
          <header className="block-head">
            <h2>Danger zone</h2>
          </header>
          <div className="settings-row">
            {!wipeConfirm ? (
              <button type="button" className="btn-danger" onClick={() => setWipeConfirm(true)}>
                Erase all my data
              </button>
            ) : (
              <>
                <button type="button" className="btn-danger" onClick={() => void wipe()} disabled={wipeBusy}>
                  {wipeBusy ? 'Erasing…' : 'Yes, erase everything'}
                </button>
                <button type="button" className="nav-btn" onClick={() => setWipeConfirm(false)}>
                  Cancel
                </button>
              </>
            )}
          </div>
          <div className="settings-row">
            <button type="button" className="sign-out" onClick={signOut}>
              Sign out
            </button>
          </div>
        </section>
      </div>
    </>
  )
}
