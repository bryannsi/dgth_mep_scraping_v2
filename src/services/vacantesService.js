import { prisma } from "./prismaClient.js";

export class VacantesService {
  /**
   * Busca una vacante por su ID interno (PK).
   *
   * @param {number|string} id
   * @returns {Promise<Object|null>}
   */
  static async findById(id) {
    return prisma.vacancy.findUnique({
      where: {
        id: Number(id),
      },
    });
  }

  /**
   * Busca una vacante por su MEP ID.
   *
   * @param {string|number} mepId
   * @returns {Promise<Object|null>}
   */
  static async findByMepId(mepId) {
    return prisma.vacancy.findFirst({
      where: {
        mepId: String(mepId),
      },
    });
  }

  /**
   * Obtiene un bloque de vacantes para reconstruir el histórico.
   *
   * En lugar de consultar una vacante a la vez mediante
   * findNextVacancy/findPreviousVacancy, obtiene todo el bloque
   * necesario en una sola consulta.
   *
   * @param {number|string} currentId
   * @param {'backward'|'forward'} direction
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  static async getHistoryChunk(currentId, direction = "backward", limit = 10) {
    const id = Number(currentId);
    const take = Number(limit);

    if (!Number.isInteger(id)) {
      throw new Error(`ID de vacante inválido: ${currentId}`);
    }

    if (!Number.isInteger(take) || take <= 0) {
      throw new Error(`Límite inválido: ${limit}`);
    }

    if (direction === "forward") {
      return prisma.vacancy.findMany({
        where: {
          id: {
            gt: id,
          },
        },
        orderBy: {
          id: "asc",
        },
        take,
      });
    }

    if (direction === "backward") {
      const vacancies = await prisma.vacancy.findMany({
        where: {
          id: {
            lt: id,
          },
        },
        orderBy: {
          id: "desc",
        },
        take,
      });

      return vacancies;
    }

    throw new Error(
      `Dirección inválida: ${direction}. Use "forward" o "backward".`
    );
  }
}