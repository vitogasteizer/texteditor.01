
import { PageMargins } from '../App';

export interface Template {
    id: string;
    name: string;
    thumbnail: string;
    content: string;
    margins?: PageMargins;
}

export const templates: Template[] = [
    {
        id: 'cv-modern',
        name: 'Modern CV',
        thumbnail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-full h-full"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h10"/><path d="M7 11h10"/><path d="M7 15h6"/></svg>',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        content: `
            <div style="font-family: 'Inter', sans-serif;">
                <div style="background-color: #2c3e50; color: white; padding: 2rem; border-radius: 0;">
                    <h1 style="margin: 0; font-size: 2.5rem;">YOUR NAME</h1>
                    <p style="margin: 0.5rem 0 0; opacity: 0.9;">PROFESSIONAL TITLE</p>
                </div>
                <div style="display: flex; gap: 2rem; padding: 2rem;">
                    <div style="flex: 1; border-right: 1px solid #eee; padding-right: 1rem;">
                        <h3 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 0.5rem;">CONTACT</h3>
                        <p>📞 +123 456 7890</p>
                        <p>📧 email@example.com</p>
                        <p>📍 City, Country</p>
                        
                        <h3 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 0.5rem; margin-top: 2rem;">SKILLS</h3>
                        <ul>
                            <li>Skill 1</li>
                            <li>Skill 2</li>
                            <li>Skill 3</li>
                        </ul>
                    </div>
                    <div style="flex: 2;">
                        <h3 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 0.5rem;">PROFILE</h3>
                        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                        
                        <h3 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 0.5rem; margin-top: 2rem;">EXPERIENCE</h3>
                        <div>
                            <h4 style="margin-bottom: 0.2rem;">Job Title</h4>
                            <p style="color: #666; font-size: 0.9rem; margin-top: 0;">Company Name | 2020 - Present</p>
                            <ul>
                                <li>Key achievement or responsibility</li>
                                <li>Another key point</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `
    },
    {
        id: 'official-letter',
        name: 'Official Letter',
        thumbnail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-full h-full"><path d="M4 4h16v16H4z"/><path d="M4 8h16"/><path d="M4 12h10"/><path d="M4 16h8"/></svg>',
        content: `
            <div style="font-family: 'Times New Roman', serif; line-height: 1.6;">
                <p style="text-align: right;">[Date]</p>
                
                <p>
                    <strong>[Recipient Name]</strong><br>
                    [Title]<br>
                    [Company Name]<br>
                    [Address]
                </p>
                
                <p style="margin-top: 2rem;">Dear [Recipient Name],</p>
                
                <p>I am writing to formally [purpose of the letter]. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in dui mauris. Vivamus hendrerit arcu sed erat molestie vehicula.</p>
                
                <p>Sed auctor neque eu tellus rhoncus ut eleifend nibh porttitor. Ut in nulla enim. Phasellus molestie magna non est bibendum non venenatis nisl tempor.</p>
                
                <p>Thank you for your time and consideration.</p>
                
                <p style="margin-top: 2rem;">Sincerely,</p>
                
                <br>
                
                <p><strong>[Your Name]</strong><br>[Your Title]</p>
            </div>
        `
    },
    {
        id: 'invoice',
        name: 'Invoice',
        thumbnail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-full h-full"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>',
        content: `
            <div style="font-family: Arial, sans-serif;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #eee; padding-bottom: 1rem;">
                    <div>
                        <h1 style="color: #333; margin: 0;">INVOICE</h1>
                        <p style="color: #666;">#INV-001</p>
                    </div>
                    <div style="text-align: right;">
                        <h3 style="margin: 0;">Your Company Name</h3>
                        <p style="margin: 0; color: #666;">Address Line 1</p>
                    </div>
                </div>
                
                <div style="display: flex; justify-content: space-between; margin-top: 2rem;">
                    <div>
                        <strong>Bill To:</strong><br>
                        Client Name<br>
                        Client Address
                    </div>
                    <div style="text-align: right;">
                        <strong>Date:</strong> Jan 1, 2024<br>
                        <strong>Due Date:</strong> Jan 30, 2024
                    </div>
                </div>
                
                <table style="width: 100%; border-collapse: collapse; margin-top: 2rem;">
                    <thead>
                        <tr style="background-color: #f8f9fa;">
                            <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Description</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 1px solid #ddd;">Quantity</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 1px solid #ddd;">Price</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 1px solid #ddd;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="padding: 12px; border-bottom: 1px solid #eee;">Service Description</td>
                            <td style="padding: 12px; text-align: right; border-bottom: 1px solid #eee;">1</td>
                            <td style="padding: 12px; text-align: right; border-bottom: 1px solid #eee;">$100.00</td>
                            <td style="padding: 12px; text-align: right; border-bottom: 1px solid #eee;">$100.00</td>
                        </tr>
                    </tbody>
                </table>
                
                <div style="text-align: right; margin-top: 2rem;">
                    <p><strong>Total: $100.00</strong></p>
                </div>
            </div>
        `
    },
    {
        id: 'meeting-agenda',
        name: 'Meeting Agenda',
        thumbnail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-full h-full"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>',
        content: `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333;">
                <div style="border-bottom: 3px solid #2980b9; padding-bottom: 1rem; margin-bottom: 2rem;">
                    <h1 style="color: #2980b9; margin: 0;">Meeting Agenda</h1>
                    <p style="margin: 0.5rem 0 0; color: #7f8c8d; font-size: 1.1rem;">Team Weekly Sync</p>
                </div>

                <table style="width: 100%; margin-bottom: 2rem; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; width: 120px;">Date:</td>
                        <td style="padding: 8px 0;">October 24, 2023</td>
                        <td style="padding: 8px 0; font-weight: bold; width: 120px;">Time:</td>
                        <td style="padding: 8px 0;">10:00 AM - 11:00 AM</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold;">Location:</td>
                        <td style="padding: 8px 0;">Conference Room B / Zoom</td>
                        <td style="padding: 8px 0; font-weight: bold;">Facilitator:</td>
                        <td style="padding: 8px 0;">Alex Smith</td>
                    </tr>
                </table>

                <h3 style="background-color: #ecf0f1; padding: 10px; border-left: 4px solid #2980b9;">Attendees</h3>
                <p>John Doe, Jane Roe, Michael Scott, Pam Beesly</p>

                <h3 style="background-color: #ecf0f1; padding: 10px; border-left: 4px solid #2980b9; margin-top: 1.5rem;">Agenda Items</h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 1rem;">
                    <thead>
                        <tr style="border-bottom: 2px solid #bdc3c7;">
                            <th style="text-align: left; padding: 10px;">Time</th>
                            <th style="text-align: left; padding: 10px;">Topic</th>
                            <th style="text-align: left; padding: 10px;">Presenter</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="border-bottom: 1px solid #ecf0f1;">
                            <td style="padding: 10px;">10:00 - 10:15</td>
                            <td style="padding: 10px;">Review of previous action items</td>
                            <td style="padding: 10px;">Alex Smith</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #ecf0f1;">
                            <td style="padding: 10px;">10:15 - 10:45</td>
                            <td style="padding: 10px;">Project X Roadmap Discussion</td>
                            <td style="padding: 10px;">Jane Roe</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #ecf0f1;">
                            <td style="padding: 10px;">10:45 - 11:00</td>
                            <td style="padding: 10px;">Q&A and Next Steps</td>
                            <td style="padding: 10px;">All</td>
                        </tr>
                    </tbody>
                </table>

                <h3 style="background-color: #ecf0f1; padding: 10px; border-left: 4px solid #2980b9; margin-top: 1.5rem;">Notes</h3>
                <p style="border: 1px dashed #bdc3c7; padding: 2rem; color: #95a5a6; text-align: center;">Type meeting notes here...</p>
            </div>
        `
    },
    {
        id: 'newsletter',
        name: 'Newsletter',
        thumbnail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-full h-full"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>',
        margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
        content: `
            <div style="font-family: Georgia, serif; color: #222;">
                <div style="text-align: center; border-bottom: 4px double #333; padding-bottom: 2rem; margin-bottom: 2rem;">
                    <div style="font-size: 0.9rem; letter-spacing: 2px; text-transform: uppercase; color: #666; margin-bottom: 0.5rem;">Weekly Edition | Vol. 42</div>
                    <h1 style="font-size: 3rem; margin: 0; text-transform: uppercase; letter-spacing: -1px;">The Daily Insight</h1>
                </div>

                <div style="display: flex; gap: 2rem;">
                    <div style="flex: 2;">
                        <h2 style="font-family: Arial, sans-serif; margin-top: 0;">Main Headline Story</h2>
                        <div style="background-color: #eee; height: 200px; display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; color: #777;">
                            [Image Placeholder]
                        </div>
                        <p><strong>LOREM IPSUM</strong> - Dolor sit amet, consectetur adipiscing elit. Vivamus lacinia odio vitae vestibulum vestibulum. Cras venenatis euismod malesuada. Nullam ac odio ante. Nulla facilisi.</p>
                        <p>Curabitur ut massa vel risus pulvinar scelerisque. Integer sed odio efficitur, viverra leo ut, gravida quam. Sed tincidunt dolor sit amet tincidunt rhoncus.</p>
                        <p><i>"This is a pull quote that highlights a key part of the story."</i></p>
                        <p>Fusce dapibus, tellus ac cursus commodo, tortor mauris condimentum nibh, ut fermentum massa justo sit amet risus.</p>
                    </div>
                    
                    <div style="flex: 1; border-left: 1px solid #ddd; padding-left: 1.5rem;">
                        <h3 style="font-family: Arial, sans-serif; color: #c0392b; border-bottom: 2px solid #c0392b; padding-bottom: 5px; margin-top: 0;">Top Picks</h3>
                        <ul style="padding-left: 1.2rem;">
                            <li style="margin-bottom: 0.5rem;"><strong>Tech:</strong> New AI tools released</li>
                            <li style="margin-bottom: 0.5rem;"><strong>Design:</strong> Minimalist trends</li>
                            <li style="margin-bottom: 0.5rem;"><strong>Culture:</strong> Remote work tips</li>
                        </ul>

                        <div style="background-color: #f9f9f9; padding: 1rem; border: 1px solid #eee; margin-top: 2rem;">
                            <h4 style="margin: 0 0 0.5rem 0; font-family: Arial, sans-serif;">Upcoming Events</h4>
                            <p style="font-size: 0.9rem; margin: 0;"><strong>Webinar:</strong> Future of Code<br><span style="color: #666;">Nov 12, 2:00 PM</span></p>
                        </div>
                    </div>
                </div>

                <div style="margin-top: 3rem; background-color: #333; color: white; padding: 2rem; text-align: center; font-family: Arial, sans-serif; font-size: 0.8rem;">
                    <p>&copy; 2024 The Daily Insight. All rights reserved.</p>
                    <p>123 News St, Media City, NY 10012</p>
                </div>
            </div>
        `
    }
];
