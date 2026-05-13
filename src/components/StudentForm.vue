<script setup> 
import { ref, watch, computed } from 'vue' 
  
const props = defineProps({ 
  editingStudent: { type: Object, default: null } 
}) 
const emit = defineEmits(['save', 'cancel']) 
  
const emptyForm = () => ({ 
  matricNo: '', name: '', course: '', faculty: '', 
  gpa: '', email: '', year: 1, active: true 
}) 
  
const form   = ref(emptyForm()) 
const errors = ref({}) 
  
watch(() => props.editingStudent, (val) => { 
  form.value   = val ? { ...val } : emptyForm() 
  errors.value = {} 
}, { immediate: true }) 
  
const isEditing = computed(() => Boolean(props.editingStudent)) 
const emailRegex  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/ 
  
function validate() { 
  const e = {} 
    if (!form.value.matricNo.trim()) 
    e.matricNo = 'Matric number is required.' 
  else if (!matricRegex.test(form.value.matricNo.trim().toUpperCase())) 
    e.matricNo = 'Format: A21CS0001 (1 letter, 2 digits, 2 letters, 4 digits).' 
  
  if (!form.value.name.trim() || form.value.name.trim().length < 3) 
    e.name = 'Name must be at least 3 characters.' 
  
  if (!emailRegex.test(form.value.email.trim())) 
    e.email = 'Please enter a valid email address.' 
  
  const gpa = Number(form.value.gpa) 
  if (Number.isNaN(gpa) || gpa < 0 || gpa > 4) 
    e.gpa = 'GPA must be between 0.00 and 4.00.' 
  
  if (!form.value.course.trim())   e.course   = 'Course is required.' 
  if (!form.value.faculty.trim())  e.faculty  = 'Faculty is required.' 
  
  errors.value = e 
  return Object.keys(e).length === 0 
} 
  
function onSubmit() { 
  if (!validate()) return 
  emit('save', { 
    ...form.value, 
    matricNo: form.value.matricNo.trim().toUpperCase(), 
    name:     form.value.name.trim(), 
    email:    form.value.email.trim(), 
    gpa:      Number(form.value.gpa), 
    year:     Number(form.value.year) 
  }) 
  if (!isEditing.value) form.value = emptyForm() 
} 
  
function onCancel() { 
  emit('cancel') 
  form.value   = emptyForm() 
  errors.value = {} 
}
</script>