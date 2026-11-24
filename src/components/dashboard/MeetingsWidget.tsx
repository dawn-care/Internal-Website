import { ArrowRight, CalendarDays, FilePen } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CALENDAR_URL } from '../../config/meetings'
import {
  isHappeningNow,
  meetingDayLabel,
  meetingPrep,
  meetingTimeRange,
  type DashboardQuery,
  type MeetingsWidget as MeetingsData,
} from '../../lib/dashboard'
import { useWithAgendas, type JoinedMeeting } from '../../lib/meetings'
import EmptyState from '../EmptyState'
import ExternalLinkLabel from '../ExternalLinkLabel'
import { MeetingDocLinks, JoinLink } from '../meetings/MeetingLinks'
import MeetingTag, { HappeningNowBadge } from '../meetings/MeetingTag'
import Skeleton from '../Skeleton'
import { FOOTER_LINK, WidgetBody, WidgetCard } from './Widget'

export default function MeetingsWidget({ query, now }: { query: DashboardQuery; now: Date }) {
  return (
    <WidgetCard
      id="meetings"
      title="Upcoming meetings"
      icon={CalendarDays}
      footer={
        <>
          <Link to="/meetings" className={FOOTER_LINK}>
            All meetings
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
          {CALENDAR_URL && (
            <a href={CALENDAR_URL} target="_blank" rel="noreferrer" className={FOOTER_LINK}>
              Open calendar
              <ExternalLinkLabel />
            </a>
          )}
        </>
      }
    >
      <WidgetBody
        query={query}
        value={query.data?.meetings}
        skeleton={
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-10 w-16" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="mt-2 h-4 w-28" />
                </div>
              </div>
            ))}
          </div>
        }
      >
        {(data) => <MeetingList data={data} now={now} />}
      </WidgetBody>
    </WidgetCard>
  )
}

function MeetingList({ data, now }: { data: MeetingsData; now: Date }) {
  const meetings = useWithAgendas(data.meetings) ?? []

  if (!data.connected) {
    return (
      <EmptyState>
        Calendar not connected. Meetings will show up here once the team calendar is linked.
      </EmptyState>
    )
  }
  if (meetings.length === 0) {
    return <EmptyState>Nothing on the team calendar for the next two weeks.</EmptyState>
  }
  const prep = meetingPrep(meetings, now)
  return (
    <>
      {prep && (
        <p className="mb-3 flex items-start gap-2 rounded-xl bg-page p-3 text-sm ring-1 ring-accent/60">
          <FilePen aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-link" />
          <span>
            <span className="font-semibold">
              {meetingDayLabel(prep.meeting, now)}&apos;s {prep.meeting.title}
            </span>{' '}
            still needs its {prep.missing.join(' and ')}.
          </span>
        </p>
      )}
      <ul className="space-y-2">
        {meetings.map((meeting, i) => (
          <MeetingRow key={meeting.id} meeting={meeting} next={i === 0} now={now} />
        ))}
      </ul>
    </>
  )
}

function MeetingRow({ meeting, next, now }: { meeting: JoinedMeeting; next: boolean; now: Date }) {
  const live = isHappeningNow(meeting, now)
  const day = meetingDayLabel(meeting, now)
  return (
    <li className={`flex gap-4 rounded-xl p-3 ${next ? 'bg-page ring-1 ring-accent/60' : ''}`}>
      <div className="w-28 shrink-0 text-sm">
        <p className={`font-semibold ${day === 'Today' ? 'text-link' : ''}`}>{day}</p>
        <p className="text-xs whitespace-nowrap text-ink-muted">{meetingTimeRange(meeting)}</p>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {live ? (
            <HappeningNowBadge />
          ) : (
            next && <span className="text-xs font-semibold text-link">Next up</span>
          )}
          <MeetingTag meeting={meeting} />
        </div>
        <a
          href={meeting.htmlLink}
          target="_blank"
          rel="noreferrer"
          className="mt-1 block rounded-sm font-medium underline-offset-4 hover:text-link hover:underline"
        >
          {meeting.title}
          <span className="sr-only"> (details in Google Calendar)</span>
          <span className="ml-1.5 inline-block align-[-2px] text-ink-muted">
            <ExternalLinkLabel />
          </span>
        </a>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <JoinLink meeting={meeting} />
          <MeetingDocLinks meeting={meeting} />
        </div>
      </div>
    </li>
  )
}
