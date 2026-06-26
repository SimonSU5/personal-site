interface TimelineItemProps {
  title: string;
  period: string;
  description: string;
}

export default function TimelineItem({ title, period, description }: TimelineItemProps) {
  return (
    <li className="timeline-item">
      <h4 className="h4 timeline-item-title">{title}</h4>
      <span>{period}</span>
      <p className="timeline-text">{description}</p>
    </li>
  );
}
