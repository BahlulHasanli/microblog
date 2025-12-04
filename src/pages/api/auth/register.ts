import type { APIRoute } from "astro";
import { supabase } from "@db/supabase";
import UsernameGenerator from "@/utils/usernameGenerator";
import AvatarManager from "@/utils/avatarGenerator";

export const prerender = false;

// Rate limit
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 dəqiqə
const MAX_REQUESTS = 5; // 15 dəqiqədə maksimum 5 qeydiyyat

// Email format validation
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

// Strong password validation
const isStrongPassword = (password: string): boolean => {
  const strongPasswordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return strongPasswordRegex.test(password) && password.length <= 128;
};

// Rate limit control
const checkRateLimit = (ip: string): boolean => {
  const now = Date.now();
  const userLimit = rateLimitStore.get(ip);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userLimit.count >= MAX_REQUESTS) {
    return false;
  }

  userLimit.count++;
  return true;
};

function validateFullName(fullName) {
  const errors = [];

  // Boş olub-olmadığını yoxla
  if (!fullName || fullName.trim() === "") {
    errors.push("Ad və soyad daxil edilməlidir");
    return { isValid: false, errors };
  }

  // Təmizlənmiş dəyər
  const trimmedName = fullName.trim();

  // Minimum uzunluq yoxlaması (ən azı 2 hərf)
  if (trimmedName.length < 2) {
    errors.push("Ad və soyad ən azı 2 hərf olmalıdır");
  }

  // Maksimum uzunluq yoxlaması
  if (trimmedName.length > 50) {
    errors.push("Ad və soyad 50 hərfdən çox ola bilməz");
  }

  // Yalnız hərflər, boşluq və Azərbaycan əlifbası
  const nameRegex = /^[a-zA-ZçəğıöşüÇƏĞIİÖŞÜ\s]+$/;
  if (!nameRegex.test(trimmedName)) {
    errors.push("Ad və soyadda yalnız hərflər istifadə edilə bilər");
  }

  // Ən azı iki söz olmalıdır (ad və soyad)
  const words = trimmedName.split(/\s+/).filter((word) => word.length > 0);
  if (words.length < 2) {
    errors.push("Həm ad, həm də soyad daxil edilməlidir");
  }

  // Hər söz ən azı 2 hərf olmalıdır
  const invalidWords = words.filter((word) => word.length < 2);
  if (invalidWords.length > 0) {
    errors.push("Ad və soyadın hər biri ən azı 2 hərf olmalıdır");
  }

  // Ardıcıl boşluqları yoxla
  if (trimmedName.includes("  ")) {
    errors.push("Ardıcıl boşluqlar istifadə edilə bilməz");
  }

  // Rəqəm yoxlaması
  if (/\d/.test(trimmedName)) {
    errors.push("Ad və soyadda rəqəm ola bilməz");
  }

  // Xüsusi simvollar yoxlaması
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(trimmedName)) {
    errors.push("Ad və soyadda xüsusi simvollar ola bilməz");
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
    cleanValue: errors.length === 0 ? trimmedName : null,
  };
}

export const POST: APIRoute = async ({
  clientAddress,
  request,
  redirect,
  cookies,
}) => {
  // Check rate limiting
  const clientIP =
    clientAddress || request.headers.get("x-forwarded-for") || "unknown";

  if (!checkRateLimit(clientIP)) {
    return new Response(
      JSON.stringify({
        message: `Bir neçə qeydiyyat istəyi göndərildi. 
          Zəhmət olmasa 15 dəqqiqə sonra təkrar cəhd edin.`,
        status: 429,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "900", // 15 dəqiqə
        },
      }
    );
  }

  const { email, password, fullName } = await request.json();

  if (!email || !password) {
    return new Response(
      JSON.stringify({
        message: `Email və şifrəni düzgün daxil edin`,
        status: 400,
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  const fullNameValidation = validateFullName(fullName);

  if (!fullNameValidation.isValid) {
    return new Response(
      JSON.stringify({
        message: fullNameValidation.errors.map((error) => error).join("\n"),
        status: 400,
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  const validEmail = isValidEmail(email);
  const validPassword = isStrongPassword(password);

  if (!validEmail) {
    return new Response(
      JSON.stringify({
        message: "Keçərli email ünvanı daxil edin",
        status: 400,
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  if (!validPassword) {
    return new Response(
      JSON.stringify({
        message:
          "Şifrə ən az 8 simvol olmalıdır. Şifrənizdə böyük, kiçik hərf və simvol istifadə edilməlidir.",
        status: 400,
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.log("error :::>>>>", error);
      return new Response(
        JSON.stringify({
          message:
            error.message === "User already registered"
              ? "Bu email artıq istifadə edilib"
              : error.message,
          status: 500,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Auth user ID-sini al
    const userId = authData?.user?.id;
    if (!userId) {
      return new Response(
        JSON.stringify({
          message: "User ID alına bilmədi",
          status: 500,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Username generate
    const generator = new UsernameGenerator(supabase);
    const generateUsername = await generator.generateUniqueUsername(fullName);

    // User avatar
    const avatarManager = new AvatarManager();
    const userAvatar = avatarManager.selectRandomAvatar();

    const { error: insertError } = await supabase.from("users").insert({
      id: userId,
      email,
      fullname: fullName,
      avatar: userAvatar?.url,
      username: generateUsername.username,
    });

    if (insertError) {
      return new Response(
        JSON.stringify({ message: insertError.message, status: 500 }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Qeydiyyatdan sonra avtomatik login et
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError || !signInData.session) {
      return new Response(
        JSON.stringify({
          message:
            "Qeydiyyat uğurla tamamlandı, ancaq avtomatik login uğursuz oldu. Zəhmət olmasa daxil olun.",
          status: 200,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Session token-larını Astro cookies API-sı ilə saxla
    const { access_token, refresh_token } = signInData.session;

    cookies.set("sb-access-token", access_token, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 gün
    });

    cookies.set("sb-refresh-token", refresh_token, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 gün
    });

    return new Response(
      JSON.stringify({ email, message: "Qeydiyyat uğurla tamamlandı" }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ message: error, status: 500 }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
