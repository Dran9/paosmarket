export const CATEGORIES = ['Bebidas','Lacteos','Panaderia','Carnes','Snacks','Abarrotes','Limpieza'] as const;
export type Category = typeof CATEGORIES[number];

export const CAT_COLORS: Record<string,string> = {
  Bebidas:'#3b82f6', Lacteos:'#0ea5e9', Panaderia:'#f59e0b',
  Carnes:'#ef4444', Snacks:'#f97316', Abarrotes:'#22c55e', Limpieza:'#a855f7'
};
export const CAT_ICONS: Record<string,string> = {
  Bebidas:'fa-wine-bottle', Lacteos:'fa-cheese', Panaderia:'fa-bread-slice',
  Carnes:'fa-drumstick-bite', Snacks:'fa-cookie-bite', Abarrotes:'fa-jar', Limpieza:'fa-spray-can-sparkles'
};

export interface Product {
  id: number;
  name: string;
  category: Category | string;
  price: number;
  cost: number;
  stock: number;
  unit: string;
  barcode: string;
}

export const PRODUCTS: Product[] = [
  {id:1,name:'Coca-Cola 600ml',category:'Bebidas',price:8,cost:5,stock:48,unit:'pza',barcode:'7501055300120'},
  {id:2,name:'Pepsi 2L',category:'Bebidas',price:15,cost:9,stock:36,unit:'pza',barcode:'7501055300236'},
  {id:3,name:'Agua Mineral 1.5L',category:'Bebidas',price:6,cost:3,stock:72,unit:'pza',barcode:'7501055300342'},
  {id:4,name:'Jugo de Naranja 1L',category:'Bebidas',price:12,cost:7,stock:24,unit:'pza',barcode:'7501055300458'},
  {id:5,name:'Cerveza Paceña 355ml',category:'Bebidas',price:10,cost:6,stock:60,unit:'pza',barcode:'7501055300564'},
  {id:6,name:'Red Bull 250ml',category:'Bebidas',price:20,cost:13,stock:18,unit:'pza',barcode:'9002490100070'},
  {id:7,name:'Te Helado 500ml',category:'Bebidas',price:7,cost:4,stock:42,unit:'pza',barcode:'7501055300786'},
  {id:8,name:'Leche Entera 1L',category:'Lacteos',price:10,cost:6,stock:56,unit:'pza',barcode:'7501055300892'},
  {id:9,name:'Leche Deslactosada 1L',category:'Lacteos',price:12,cost:8,stock:38,unit:'pza',barcode:'7501055300908'},
  {id:10,name:'Yogurt Natural 1kg',category:'Lacteos',price:16,cost:10,stock:30,unit:'pza',barcode:'7501055301011'},
  {id:11,name:'Queso Panela 400g',category:'Lacteos',price:28,cost:18,stock:15,unit:'pza',barcode:'7501055301127'},
  {id:12,name:'Crema Acida 200ml',category:'Lacteos',price:8,cost:5,stock:28,unit:'pza',barcode:'7501055301233'},
  {id:13,name:'Helado Vainilla 1L',category:'Lacteos',price:24,cost:15,stock:12,unit:'pza',barcode:'7501055301349'},
  {id:14,name:'Pan Blanco 680g',category:'Panaderia',price:16,cost:9,stock:22,unit:'pza',barcode:'7501055301455'},
  {id:15,name:'Pan Integral 680g',category:'Panaderia',price:18,cost:11,stock:18,unit:'pza',barcode:'7501055301561'},
  {id:16,name:'Pan Dulce Surtido',category:'Panaderia',price:3,cost:1.5,stock:80,unit:'pza',barcode:'7501055301677'},
  {id:17,name:'Galletas de Chocolate',category:'Panaderia',price:9,cost:5,stock:45,unit:'pza',barcode:'7501055301783'},
  {id:18,name:'Tortillas de Maiz 1kg',category:'Panaderia',price:10,cost:6,stock:50,unit:'kg',barcode:'7501055301899'},
  {id:19,name:'Pechuga de Pavo 250g',category:'Carnes',price:25,cost:16,stock:14,unit:'pza',barcode:'7501055302002'},
  {id:20,name:'Jamon 250g',category:'Carnes',price:22,cost:14,stock:20,unit:'pza',barcode:'7501055302118'},
  {id:21,name:'Salchicha 500g',category:'Carnes',price:20,cost:12,stock:25,unit:'pza',barcode:'7501055302224'},
  {id:22,name:'Tocino 250g',category:'Carnes',price:27,cost:17,stock:10,unit:'pza',barcode:'7501055302330'},
  {id:23,name:'Queso Manchego 200g',category:'Carnes',price:32,cost:20,stock:8,unit:'pza',barcode:'7501055302446'},
  {id:24,name:'Papas Fritas 150g',category:'Snacks',price:10,cost:6,stock:55,unit:'pza',barcode:'2840003010605'},
  {id:25,name:'Cacahuates Salados 200g',category:'Snacks',price:8,cost:4,stock:40,unit:'pza',barcode:'7501055302668'},
  {id:26,name:'Doritos Nacho 150g',category:'Snacks',price:12,cost:7,stock:35,unit:'pza',barcode:'2840003010711'},
  {id:27,name:'Galletas Saladas 200g',category:'Snacks',price:7,cost:4,stock:48,unit:'pza',barcode:'7501055302880'},
  {id:28,name:'Frutos Secos Mix 200g',category:'Snacks',price:18,cost:11,stock:22,unit:'pza',barcode:'7501055302996'},
  {id:29,name:'Barra de Chocolate',category:'Snacks',price:7,cost:3.5,stock:60,unit:'pza',barcode:'7622210590314'},
  {id:30,name:'Arroz 1kg',category:'Abarrotes',price:12,cost:8,stock:40,unit:'kg',barcode:'7501055303108'},
  {id:31,name:'Frijoles Negros 1kg',category:'Abarrotes',price:14,cost:9,stock:35,unit:'kg',barcode:'7501055303214'},
  {id:32,name:'Aceite Vegetal 1L',category:'Abarrotes',price:16,cost:10,stock:30,unit:'pza',barcode:'7501055303320'},
  {id:33,name:'Azucar 1kg',category:'Abarrotes',price:14,cost:9,stock:45,unit:'kg',barcode:'7501055303436'},
  {id:34,name:'Sal 1kg',category:'Abarrotes',price:5,cost:2.5,stock:55,unit:'kg',barcode:'7501055303542'},
  {id:35,name:'Pasta Espagueti 500g',category:'Abarrotes',price:6,cost:3.5,stock:50,unit:'pza',barcode:'7501055303658'},
  {id:36,name:'Salsa de Tomate 400g',category:'Abarrotes',price:8,cost:4.5,stock:38,unit:'pza',barcode:'7501055303764'},
  {id:37,name:'Cafe Instantaneo 95g',category:'Abarrotes',price:20,cost:13,stock:20,unit:'pza',barcode:'7501055303870'},
  {id:38,name:'Detergente Polvo 1kg',category:'Limpieza',price:18,cost:11,stock:25,unit:'pza',barcode:'7501055303986'},
  {id:39,name:'Jabon Liquido 750ml',category:'Limpieza',price:16,cost:10,stock:28,unit:'pza',barcode:'7501055304099'},
  {id:40,name:'Papel Higienico 4 rollos',category:'Limpieza',price:14,cost:8,stock:35,unit:'pza',barcode:'7501055304105'}
];

export interface User {
  id: string;
  name: string;
  role: 'owner' | 'vendedora';
  avatar: string;
  color: string;
  canDashboard: boolean;
}

export const USERS: User[] = [
  { id:'paola', name:'Sra. Paola', role:'owner', avatar:'P', color:'#ec4899', canDashboard:true },
  { id:'esperancita', name:'Esperancita', role:'vendedora', avatar:'E', color:'#f59e0b', canDashboard:false }
];

export interface Driver {
  id: string;
  name: string;
  phone: string;
  plate: string;
}

export const DRIVERS: Driver[] = [
  { id:'d1', name:'Jonhy Mamani', phone:'59178001001', plate:'3456-ABC' },
  { id:'d2', name:'Gerson Colque', phone:'59178001002', plate:'7891-DEF' },
  { id:'d3', name:'Rolando Quispe', phone:'59178001003', plate:'2345-GHI' },
  { id:'d4', name:'Felix Callisaya', phone:'59178001004', plate:'6789-JKL' }
];
