import { Inngest } from 'inngest'

export const inngest = new Inngest({ id: 'yahoo-news-pipeline', 
 eventKey: process.env.INNGEST_EVENT_KEY})