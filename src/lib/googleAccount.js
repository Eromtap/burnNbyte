import prisma from '@/lib/prisma';

export async function resolveGoogleAccount(profile) {
  if (profile?.email_verified !== true || !profile?.sub || !profile?.email) {
    throw new Error('GoogleIdentityInvalid');
  }
  const email = profile.email.trim().toLowerCase();
  const existingGoogle = await prisma.user.findUnique({ where: { googleSubject: profile.sub } });
  if (existingGoogle) return existingGoogle;
  const existingEmail = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true },
  });
  if (existingEmail) throw new Error('GoogleAccountExists');
  try {
    return await prisma.user.create({
      data: { email, name: profile.name || null, googleSubject: profile.sub },
    });
  } catch (error) {
    if (error.code !== 'P2002') throw error;
    // Concurrent sign-ins for the same Google identity must resolve to one user.
    const racedUser = await prisma.user.findUnique({ where: { googleSubject: profile.sub } });
    if (racedUser) return racedUser;
    throw new Error('GoogleAccountExists');
  }
}
