import { collection, addDoc, doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { getCompanyCollection } from '../utils/firestoreUtils';

const PIZZAS_DATA = [
    {
        name: 'Margherita',
        description: 'Molho de tomate artesanal, muçarela, rodelas de tomate e manjericão fresco',
        ingredients: ['Molho de tomate artesanal', 'Muçarela', 'Rodelas de tomate', 'Manjericão fresco'],
        category: 'pizza',
        active: true,
        prices: {
            'Broto': 29.90,
            'Média': 39.90,
            'Grande': 49.90
        }
    },
    {
        name: 'Calabresa',
        description: 'Calabresa fatiada, cebola roxa, muçarela e orégano',
        ingredients: ['Calabresa fatiada', 'Cebola roxa', 'Muçarela', 'Orégano'],
        category: 'pizza',
        active: true,
        prices: {
            'Broto': 32.90,
            'Média': 42.90,
            'Grande': 52.90
        }
    },
    {
        name: 'Portuguesa',
        description: 'Presunto, ovos, cebola, pimentão, ervilha, muçarela e azeitonas',
        ingredients: ['Presunto', 'Ovos', 'Cebola', 'Pimentão', 'Ervilha', 'Muçarela', 'Azeitonas'],
        category: 'pizza',
        active: true,
        prices: {
            'Broto': 34.90,
            'Média': 44.90,
            'Grande': 54.90
        }
    },
    {
        name: 'Quatro Queijos',
        description: 'Muçarela, provolone, gorgonzola e catupiry',
        ingredients: ['Muçarela', 'Provolone', 'Gorgonzola', 'Catupiry'],
        category: 'pizza',
        active: true,
        prices: {
            'Broto': 36.90,
            'Média': 46.90,
            'Grande': 56.90
        }
    },
    {
        name: 'Frango com Catupiry',
        description: 'Frango desfiado, catupiry cremoso e orégano',
        ingredients: ['Frango desfiado', 'Catupiry cremoso', 'Orégano'],
        category: 'pizza',
        active: true,
        prices: {
            'Broto': 39.90,
            'Média': 45.90,
            'Grande': 55.90
        }
    },
    {
        name: 'Pepperoni Lovers',
        description: 'Pepperoni crocante, muçarela e toque de parmesão',
        ingredients: ['Pepperoni crocante', 'Muçarela', 'Parmesão'],
        category: 'pizza',
        active: true,
        prices: {
            'Broto': 39.90, // Estimado baseado no padrão (mesmo que Frango)
            'Média': 45.90,
            'Grande': 55.90
        }
    },
    {
        name: 'Romeu e Julieta',
        description: 'Muçarela, goiabada cremosa e raspas de parmesão',
        ingredients: ['Muçarela', 'Goiabada cremosa', 'Raspas de parmesão'],
        category: 'pizza',
        active: true,
        prices: {
            'Broto': 35.90, // Estimado
            'Média': 45.90,
            'Grande': 55.90
        }
    },
    {
        name: 'Chocolate com Morango',
        description: 'Chocolate ao leite derretido, morangos frescos e leite condensado',
        ingredients: ['Chocolate ao leite', 'Morangos frescos', 'Leite condensado'],
        category: 'pizza',
        active: true,
        prices: {
            'Broto': 35.90, // Estimado
            'Média': 45.90,
            'Grande': 55.90
        }
    }
];

export const seedPizzas = async (companyId) => {
    try {
        const batch = writeBatch(db);

        // 1. Coletar todos os ingredientes para atualizar a config
        const todosIngredientes = new Set();
        PIZZAS_DATA.forEach(p => {
            p.ingredients.forEach(i => todosIngredientes.add(i));
        });

        // Config Ref
        const configRef = doc(db, 'companies', companyId, 'settings', 'cardapio_config');
        batch.set(configRef, {
            ingredientesPizza: Array.from(todosIngredientes).sort()
        }, { merge: true });

        // Config de Tamanhos (Garantir que exista Média/Broto/Grande)
        batch.set(configRef, {
            pizzaConfig: {
                sizes: [
                    { name: 'Fatia', maxFlavors: 1 },
                    { name: 'Broto', maxFlavors: 2 },
                    { name: 'Média', maxFlavors: 3 }, // Accent match
                    { name: 'Grande', maxFlavors: 4 }
                ],
                pricingMode: 'HIGHER'
            }
        }, { merge: true });

        // 2. Adicionar as Pizzas
        // Nota: Batch tem limite de 500 ops, aqui temos ~10, tranquilo.
        for (const pizza of PIZZAS_DATA) {
            const newDocRef = doc(getCompanyCollection(companyId, 'cardapio'));
            batch.set(newDocRef, {
                name: pizza.name,
                category: 'pizza',
                active: true,
                description: pizza.description, // Opcional, se o UI suportar
                prices: pizza.prices,
                ingredients: pizza.ingredients,
                createdAt: Date.now()
            });
        }

        await batch.commit();
        return true;
    } catch (error) {
        console.error("Erro ao semear pizzas:", error);
        return false;
    }
};
