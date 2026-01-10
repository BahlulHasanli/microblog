import { Resend } from "resend";

const resend = new Resend(import.meta.env.RESEND_API_KEY);

interface ContactEmailData {
  fullName: string;
  email: string;
  subject: string;
  message: string;
}

interface VacancyEmailData {
  name: string;
  email: string;
  message: string;
}

const subjectLabels: Record<string, string> = {
  teklif: "Təklif",
  shikayet: "Şikayət",
  emekdasliq: "Əməkdaşlıq",
  diger: "Digər",
};

export async function sendContactEmail(data: ContactEmailData) {
  const subjectLabel = subjectLabels[data.subject] || data.subject;

  const { error } = await resend.emails.send({
    from: "The99 <noreply@the99.az>",
    to: "we@the99.az",
    subject: `[Əlaqə] ${subjectLabel} - ${data.fullName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a; border-bottom: 2px solid #f43f5e; padding-bottom: 10px;">
          Yeni Əlaqə Müraciəti
        </h2>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; width: 120px;">Ad Soyad:</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${data.fullName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">
              <a href="mailto:${data.email}" style="color: #f43f5e;">${data.email}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Mövzu:</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${subjectLabel}</td>
          </tr>
        </table>
        
        <div style="margin-top: 20px;">
          <h3 style="color: #1a1a1a; margin-bottom: 10px;">Müraciət Mətni:</h3>
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; white-space: pre-wrap;">
            ${data.message}
          </div>
        </div>
        
        <p style="margin-top: 30px; font-size: 12px; color: #6b7280;">
          Bu email the99.az saytındakı əlaqə formu vasitəsilə göndərilib.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("Email sending error:", error);
    throw error;
  }

  return { success: true };
}

export async function sendVacancyEmail(data: VacancyEmailData) {
  const { error } = await resend.emails.send({
    from: "The99 <noreply@the99.az>",
    to: "we@the99.az",
    subject: `[Vakansiya] Yeni Müraciət - ${data.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a; border-bottom: 2px solid #f43f5e; padding-bottom: 10px;">
          Yeni Vakansiya Müraciəti
        </h2>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; width: 120px;">Ad Soyad:</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${data.name}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">
              <a href="mailto:${data.email}" style="color: #f43f5e;">${data.email}</a>
            </td>
          </tr>
        </table>
        
        <div style="margin-top: 20px;">
          <h3 style="color: #1a1a1a; margin-bottom: 10px;">Müraciət Mətni:</h3>
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; white-space: pre-wrap;">
            ${data.message}
          </div>
        </div>
        
        <p style="margin-top: 30px; font-size: 12px; color: #6b7280;">
          Bu email the99.az saytındakı vakansiya formu vasitəsilə göndərilib.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("Email sending error:", error);
    throw error;
  }

  return { success: true };
}
