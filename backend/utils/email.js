import nodemailer from 'nodemailer';

let etherealTransporter = null;

const getTransporter = async () => {
    // 1. If real SMTP credentials are provided, use them
    const hasRealCredentials = process.env.EMAIL_USER &&
        process.env.EMAIL_PASS &&
        process.env.EMAIL_USER !== 'mockuser' &&
        process.env.EMAIL_USER !== 'test' &&
        !process.env.EMAIL_HOST?.includes('mailtrap.io');

    if (hasRealCredentials) {
        // If Gmail service is preferred or host is gmail
        if (process.env.EMAIL_SERVICE === 'gmail' || process.env.EMAIL_HOST?.includes('gmail.com')) {
            return {
                transporter: nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS,
                    },
                }),
                isTest: false,
            };
        }

        return {
            transporter: nodemailer.createTransport({
                host: process.env.EMAIL_HOST || 'smtp.gmail.com',
                port: Number(process.env.EMAIL_PORT) || 587,
                secure: Number(process.env.EMAIL_PORT) === 465,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            }),
            isTest: false,
        };
    }

    // 2. Otherwise, use Ethereal test mailer for instant live email delivery & web inbox preview
    if (!etherealTransporter) {
        try {
            const testAccount = await nodemailer.createTestAccount();
            etherealTransporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass,
                },
            });
            console.log(`\n📮 Created Ethereal Mailbox: ${testAccount.user}\n`);
        } catch (err) {
            console.error('Failed to create Ethereal test account:', err.message);
            return null;
        }
    }

    return { transporter: etherealTransporter, isTest: true };
};

const sendEmail = async (options) => {
    try {
        const transObj = await getTransporter();
        if (!transObj) {
            console.log(`\n📨 [SIMULATED EMAIL] To: ${options.email} | Content: ${options.message}\n`);
            return null;
        }

        const mailOptions = {
            from: `FleetFlow <${process.env.FROM_EMAIL || process.env.EMAIL_USER || 'noreply@fleetflow.com'}>`,
            to: options.email,
            subject: options.subject,
            text: options.message,
            html: options.html,
        };

        const info = await transObj.transporter.sendMail(mailOptions);

        if (transObj.isTest) {
            const previewUrl = nodemailer.getTestMessageUrl(info);
            console.log(`\n📬 [TEST EMAIL DELIVERED] To: ${options.email}`);
            console.log(`🔗 Web Inbox Preview: ${previewUrl}\n`);
            return { previewUrl, messageId: info.messageId };
        } else {
            console.log(`\n✅ [REAL EMAIL DELIVERED] To: ${options.email}\n`);
            return { messageId: info.messageId };
        }
    } catch (err) {
        console.error(`❌ Email delivery error for ${options.email}:`, err.message);
        return null;
    }
};

export default sendEmail;
