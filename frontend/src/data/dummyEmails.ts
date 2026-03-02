import type { EmailItem } from "../components/EmailList";
import type { EmailDetailData } from "../components/EmailDetail";

export const dummyEmailList: EmailItem[] = [
  {
    id: "1",
    sender: "John Doe",
    subject: "Project Update - Required Actions",
    snippet:
      "Hi team just wanted to check on the progress of the current sprint...",
    time: "10:30 AM",
  },
  {
    id: "2",
    sender: "Sarah Smith",
    subject: "Lunch tomorrow?",
    snippet:
      "Are you free for lunch tomorrow? I'd like to discuss the Q4 roadmap...",
    time: "9:15 AM",
  },
  {
    id: "3",
    sender: "Weekly Newsletter",
    subject: "Top Tech Trends 2024",
    snippet:
      "Your weekly digest. This week: AI tools, cloud updates, and more...",
    time: "Yesterday",
  },
];

const email1Body = `Hi team,

I just wanted to check on the progress of the current sprint. Can everyone update their tasks by EOD?

Thanks,
John`;

export const dummyEmailDetails: Record<string, EmailDetailData> = {
  "1": {
    id: "1",
    sender: "John Doe",
    senderEmail: "john.doe@example.com",
    to: "Me",
    toEmail: "john.doe@example.com",
    subject: "Project Update - Required Actions",
    date: "Oct 24, 2023",
    time: "10:30 AM",
    body: email1Body,
  },
  "2": {
    id: "2",
    sender: "Sarah Smith",
    senderEmail: "sarah.smith@example.com",
    to: "Me",
    toEmail: "john.doe@example.com",
    subject: "Lunch tomorrow?",
    date: "Oct 24, 2023",
    time: "9:15 AM",
    body: "Are you free for lunch tomorrow? I'd like to discuss the Q4 roadmap.",
  },
  "3": {
    id: "3",
    sender: "Weekly Newsletter",
    senderEmail: "newsletter@example.com",
    to: "Me",
    toEmail: "john.doe@example.com",
    subject: "Top Tech Trends 2024",
    date: "Oct 23, 2023",
    time: "8:00 AM",
    body: "Your weekly digest. This week: AI tools, cloud updates, and more.",
  },
};
