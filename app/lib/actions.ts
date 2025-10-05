'use server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import postgres from 'postgres'
import { ca } from 'zod/v4/locales'

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' })

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(['pending', 'paid']),
  date: z.string()
})

const CreateInvoice = FormSchema.omit({ id: true, date: true })
const UpdateInvoice = FormSchema.omit({ id: true, date: true })

export async function createInvoice(formData: FormData) {
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status')
  })
  const amountInCents = amount * 100 // Convertir a centavos
  const date = new Date().toISOString().split('T')[0] // Formatear como 'YYYY-MM-DD'

  try {
    await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
  `
  } catch (error) {
    console.error('Error creating invoice:', error)
    throw error
  }
  revalidatePath('/dashboard/invoices')
  redirect('/dashboard/invoices')
}

export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status')
  })

  const amountInCents = amount * 100

  try {
    await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}
  `
  } catch (error) {
    // We'll also log the error to the console for now
    console.error(error)
    throw error
    // return { message: 'Database Error: Failed to Update Invoice.' }
  }

  revalidatePath('/dashboard/invoices')
  redirect('/dashboard/invoices')
}

export async function deleteInvoice(id: string) {
  //   throw new Error('Failed to Delete Invoice')
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`
  } catch (error) {
    console.error('Error deleting invoice:', error)
    throw error
  }
  revalidatePath('/dashboard/invoices')
}
