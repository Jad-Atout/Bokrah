//TODO redfine the email structure so it can't be a spam email
export async function welcomeEmailTemplate( userName, token) {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: rgb(37, 99, 235);">Welcome to Bokrah, ${userName}! 🎉</h2>
            <p>Thank you for joining our website. We're excited to have you on board! Click the link below to confirm your email:</p>
            <a href="${process.env.BASE_URL}/auth/confirmEmail/${token}" 
               style="display: inline-block; padding: 10px 20px; color: white; background-color: rgb(37, 99, 235); text-decoration: none; border-radius: 5px; margin-top: 10px;">
               Confirm Your Email
            </a>
            <br><br>
            <img src="https://res.cloudinary.com/dfz3ebgmr/image/upload/v1740344135/Bookrah_cigw3k.png" alt="Welcome Image" style="max-width: 100%; border-radius: 5px;">
            <p>If you did not sign up for this account, please ignore this email.</p>
            <p>Best Regards,<br><strong>Bokrah Team</strong></p>

            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

            <footer style="text-align: center; font-size: 12px; color: #888;">
                © ${new Date().getFullYear()} Bokrah. All Rights Reserved.
            </footer>
        </div>
    `;
}

export async function sendCodeTemplate(email, userName, code) {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: rgb(37, 99, 235);">Verification Code</h2>
            <p>Hello ${userName},</p>
            <p>Use the following verification code to complete your request:</p>
            <div style="font-size: 24px; font-weight: bold; color: rgb(37, 99, 235); text-align: center; padding: 10px; border: 1px dashed rgb(37, 99, 235); border-radius: 5px; display: inline-block;">
                ${code}
            </div>
            <p>This code is valid for a limited time. If you did not request this code, please ignore this email.</p>
            <p>Best Regards,<br><strong>Bokrah Team</strong></p>

            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

            <footer style="text-align: center; font-size: 12px; color: #888;">
                © ${new Date().getFullYear()} Bokrah. All Rights Reserved.
            </footer>
        </div>
    `;
}

export async function setPasswordEmailTemplate( userName, token) {

    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: rgb(37, 99, 235);">Set Your Password & Confirm Your Email, ${userName}! 🔐</h2>
            <p>You're almost there! To complete your registration, please set your password and confirm your email by clicking the button below:</p>
            
            <a href="${process.env.BASE_URL}/auth/set-password/${token}" 
               style="display: inline-block; padding: 10px 20px; color: white; background-color: rgb(37, 99, 235); text-decoration: none; border-radius: 5px; margin-top: 10px;">
               Set Your Password
            </a>

            <br><br>
            <img src="https://res.cloudinary.com/dfz3ebgmr/image/upload/v1740344135/Bookrah_cigw3k.png" 
                 alt="Bokrah Logo" 
                 style="max-width: 100%; border-radius: 5px;">
            
            <p>If you did not sign up for this account, please ignore this email.</p>
            
            <p>Best Regards,<br><strong>Bokrah Team</strong></p>

            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

            <footer style="text-align: center; font-size: 12px; color: #888;">
                © ${new Date().getFullYear()} Bokrah. All Rights Reserved.
            </footer>
        </div>
    `;
}
// , startTime , endTime


export async function appointmentConfirmationEmail(
    customerName,
    staffNames,
    serviceNames,
    startTime,
    endTime,
) {
    const startTimeString = startTime
        ? new Date(startTime).toLocaleString()
        : "N/A";
    const endTimeString = endTime
        ? new Date(endTime).toLocaleString()
        : "N/A";

    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
      <h2 style="color: rgb(37, 99, 235);">Appointment Confirmation 📅</h2>
      <p>Dear ${customerName},</p>
      
      <p>Your appointment has been successfully scheduled with <strong>${staffNames}</strong>.</p>

      <p><strong>Details:</strong></p>
      <ul>
        <li><strong>Service(s):</strong> ${serviceNames.join(", ")}</li>
        <li><strong>Date & Time:</strong> ${startTimeString}</li>
        <li><strong>End Time:</strong> ${endTimeString}</li>
      </ul>

      <p>We look forward to seeing you! If you need to reschedule or cancel, please contact us in advance.</p>

      <br>
      <img 
        src="https://res.cloudinary.com/dfz3ebgmr/image/upload/v1740344135/Bookrah_cigw3k.png" 
        alt="Bokrah Logo" 
        style="max-width: 100%; border-radius: 5px;"
      />

      <p>Best Regards,<br><strong>Bokrah Team</strong></p>

      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

      <footer style="text-align: center; font-size: 12px; color: #888;">
        © ${new Date().getFullYear()} Bokrah. All Rights Reserved.
      </footer>
    </div>
  `;
}


export async function appointmentFullDetailsEmail(
    userName,
    staffNames,
    allServices,
    subAppointments,
    appointmentId,
    clientId
) {
    // Format the times
    const formatOptions = {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    };

    // Build a list of sub-appointments, each with its own Cancel link
    const subAppointmentsHTML = subAppointments
        .map((sub, i) => {
            const startStr = new Date(sub.startTime).toLocaleString(
                "en-US",
                formatOptions
            );
            const endStr = new Date(sub.endTime).toLocaleString(
                "en-US",
                formatOptions
            );
            const serviceList = Array.isArray(sub.services)
                ? sub.services.map((s) => s.serviceName).join(", ")
                : "No services";

            const subCancelLink = `${process.env.BASE_URL}/appointment/${clientId}/${appointmentId}/sub/${sub._id}/`;

            return `
        <div style="margin-bottom: 1em;">
          <strong>Sub-Appointment #${i + 1}</strong><br/>
          <strong>Start:</strong> ${startStr}<br/>
          <strong>End:</strong>   ${endStr}<br/>
          <strong>Services:</strong> ${serviceList}
          <br/><br/>
          <!-- Button to cancel just this sub-appointment -->
          <a 
            href="${subCancelLink}"
            style="
              display:inline-block;
              padding:8px 14px;
              background:#f97316; /* orangeish color */
              color:#fff;
              text-decoration:none;
              border-radius:4px;
              font-weight:bold;
            "
          >
            Cancel This Sub-Appointment
          </a>
        </div>
      `;
        })
        .join("");

    // Single link for cancelling the entire appointment
    // (Uses your existing PATCH /:appointmentId/cancel/:clientId route)
    const cancelAllLink = `${process.env.BASE_URL}/appointment/${appointmentId}/cancel/${clientId}`;

    return `
    <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto; padding:20px; border:1px solid #ddd; border-radius:10px;">
      <h2 style="color: #2563EB;">Appointment Details 📅</h2>
      <p>Dear ${userName},</p>
      <p>Your appointment is scheduled with <strong>${staffNames}</strong>.</p>
      
      <p><strong>All Services:</strong> ${allServices.join(", ")}</p>

      <h3>Sub-Appointments:</h3>
      ${subAppointmentsHTML}

      <br/>
      <!-- Button to cancel the entire appointment -->
      <a 
        href="${cancelAllLink}"
        style="
          display:inline-block;
          padding:12px 18px;
          background:#dc2626; /* red color */
          color:#fff;
          text-decoration:none;
          border-radius:6px;
          font-weight:bold;
        "
      >
        Cancel Entire Appointment
      </a>

      <p style="margin-top: 1em;">
        If you need to reschedule or cancel, please use the links above or contact us in advance.
      </p>

      <br/>
      <img src="https://res.cloudinary.com/dfz3ebgmr/image/upload/v1740344135/Bookrah_cigw3k.png"
           alt="Bokrah Logo"
           style="max-width:100%; border-radius:5px;" />

      <p>Best Regards,<br/><strong>Bokrah Team</strong></p>
      <hr style="border:none; border-top:1px solid #ddd; margin:20px 0;" />
      <footer style="text-align:center; font-size:12px; color:#888;">
        © ${new Date().getFullYear()} Bokrah. All Rights Reserved.
      </footer>
    </div>
  `;
}


export async function appointmentDeletedEmail(
    userName,
    staffNames,
    allServices,
    subAppointments = []
) {
    // Format the times for any sub‑appointments you still want to display
    const formatOptions = {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    };

    // If you want to show which sub-appointments were canceled, you can build an HTML list:
    const subAppointmentsHTML = subAppointments.map((sub, i) => {
        const startStr = new Date(sub.startTime).toLocaleString("en-US", formatOptions);
        const endStr   = new Date(sub.endTime).toLocaleString("en-US", formatOptions);

        const serviceList = Array.isArray(sub.services)
            ? sub.services.map(s => s.serviceName).join(", ")
            : "No services";

        return `
      <div style="margin-bottom: 1em;">
        <strong>Sub-Appointment #${i + 1}</strong><br/>
        <strong>Start:</strong> ${startStr}<br/>
        <strong>End:</strong>   ${endStr}<br/>
        <strong>Services:</strong> ${serviceList}
      </div>
    `;
    }).join("");

    return `
    <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto; padding:20px; border:1px solid #ddd; border-radius:10px;">
      <h2 style="color: #e3342f;">Appointment Canceled</h2>
      <p>Dear ${userName},</p>
      
      <p>We wanted to let you know that your appointment with <strong>${staffNames}</strong> has been 
      <strong style="color: #e3342f;">canceled</strong>. Below are the details of the canceled appointment:</p>

      <p><strong>All Services:</strong> ${allServices.join(", ")}</p>

      ${
        subAppointments.length > 0
            ? `
            <h3>Canceled Sub-Appointments:</h3>
            ${subAppointmentsHTML}
          `
            : ""
    }

      <p>If you have any questions or would like to schedule a new appointment, feel free to reach out.</p>
      
      <br/>
      <img 
        src="https://res.cloudinary.com/dfz3ebgmr/image/upload/v1740344135/Bookrah_cigw3k.png"
        alt="Bokrah Logo"
        style="max-width:100%; border-radius:5px;"
      />
      <p>Best Regards,<br/><strong>Bokrah Team</strong></p>
      <hr style="border:none; border-top:1px solid #ddd; margin:20px 0;" />
      <footer style="text-align:center; font-size:12px; color:#888;">
        © ${new Date().getFullYear()} Bokrah. All Rights Reserved.
      </footer>
    </div>
  `;
}
